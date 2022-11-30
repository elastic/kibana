/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IContextProvider,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
} from '@kbn/core/server';

import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  PluginStartContract as FeaturesPluginStart,
  PluginSetupContract as FeaturesPluginSetup,
} from '@kbn/features-plugin/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';

import { APP_ID } from '../common/constants';
import {
  createCaseCommentSavedObjectType,
  caseConfigureSavedObjectType,
  caseConnectorMappingsSavedObjectType,
  createCaseSavedObjectType,
  createCaseUserActionSavedObjectType,
  casesTelemetrySavedObjectType,
} from './saved_object_types';

import type { CasesClient } from './client';
import type { CasesRequestHandlerContext, PluginSetupContract, PluginStartContract } from './types';
import { CasesClientFactory } from './client/factory';
import { getCasesKibanaFeature } from './features';
import { registerRoutes } from './routes/api/register_routes';
import { getExternalRoutes } from './routes/api/get_external_routes';
import { createCasesTelemetry, scheduleCasesTelemetryTask } from './telemetry';
import { getInternalRoutes } from './routes/api/get_internal_routes';
import { PersistableStateAttachmentTypeRegistry } from './attachment_framework/persistable_state_registry';
import { ExternalReferenceAttachmentTypeRegistry } from './attachment_framework/external_reference_registry';
import { UserProfileService } from './services';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from './common/constants';

export interface PluginsSetup {
  actions: ActionsPluginSetup;
  lens: LensServerPluginSetup;
  features: FeaturesPluginSetup;
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
  taskManager?: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
}

export interface PluginsStart {
  actions: ActionsPluginStart;
  features: FeaturesPluginStart;
  licensing: LicensingPluginStart;
  taskManager?: TaskManagerStartContract;
  security: SecurityPluginStart;
  spaces: SpacesPluginStart;
  notifications: NotificationsPluginStart;
}

export class CasePlugin {
  private readonly logger: Logger;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private clientFactory: CasesClientFactory;
  private securityPluginSetup?: SecurityPluginSetup;
  private lensEmbeddableFactory?: LensServerPluginSetup['lensEmbeddableFactory'];
  private persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  private externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  private userProfileService: UserProfileService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.logger = this.initializerContext.logger.get();
    this.clientFactory = new CasesClientFactory(this.logger);
    this.persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
    this.externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
    this.userProfileService = new UserProfileService(this.logger);
  }

  public setup(core: CoreSetup, plugins: PluginsSetup): PluginSetupContract {
    this.logger.debug(
      `Setting up Case Workflow with core contract [${Object.keys(
        core
      )}] and plugins [${Object.keys(plugins)}]`
    );

    this.securityPluginSetup = plugins.security;
    this.lensEmbeddableFactory = plugins.lens.lensEmbeddableFactory;

    plugins.features.registerKibanaFeature(getCasesKibanaFeature());

    core.savedObjects.registerType(
      createCaseCommentSavedObjectType({
        migrationDeps: {
          persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
          lensEmbeddableFactory: this.lensEmbeddableFactory,
        },
      })
    );
    core.savedObjects.registerType(caseConfigureSavedObjectType);
    core.savedObjects.registerType(caseConnectorMappingsSavedObjectType);
    core.savedObjects.registerType(createCaseSavedObjectType(core, this.logger));
    core.savedObjects.registerType(
      createCaseUserActionSavedObjectType({
        persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
      })
    );
    core.savedObjects.registerType(casesTelemetrySavedObjectType);

    core.http.registerRouteHandlerContext<CasesRequestHandlerContext, 'cases'>(
      APP_ID,
      this.createRouteHandlerContext({
        core,
      })
    );

    if (plugins.taskManager && plugins.usageCollection) {
      createCasesTelemetry({
        core,
        taskManager: plugins.taskManager,
        usageCollection: plugins.usageCollection,
        logger: this.logger,
        kibanaVersion: this.kibanaVersion,
      });
    }

    const router = core.http.createRouter<CasesRequestHandlerContext>();
    const telemetryUsageCounter = plugins.usageCollection?.createUsageCounter(APP_ID);

    registerRoutes({
      router,
      routes: [...getExternalRoutes(), ...getInternalRoutes(this.userProfileService)],
      logger: this.logger,
      kibanaVersion: this.kibanaVersion,
      telemetryUsageCounter,
    });

    plugins.licensing.featureUsage.register(LICENSING_CASE_ASSIGNMENT_FEATURE, 'platinum');

    return {
      attachmentFramework: {
        registerExternalReference: (externalReferenceAttachmentType) => {
          this.externalReferenceAttachmentTypeRegistry.register(externalReferenceAttachmentType);
        },
        registerPersistableState: (persistableStateAttachmentType) => {
          this.persistableStateAttachmentTypeRegistry.register(persistableStateAttachmentType);
        },
      },
    };
  }

  public start(core: CoreStart, plugins: PluginsStart): PluginStartContract {
    this.logger.debug(`Starting Case Workflow`);

    if (plugins.taskManager) {
      scheduleCasesTelemetryTask(plugins.taskManager, this.logger);
    }

    this.userProfileService.initialize({
      spaces: plugins.spaces,
      // securityPluginSetup will be set to a defined value in the setup() function
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      securityPluginSetup: this.securityPluginSetup!,
      securityPluginStart: plugins.security,
      licensingPluginStart: plugins.licensing,
    });

    this.clientFactory.initialize({
      // securityPluginSetup will be set to a defined value in the setup() function
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      securityPluginSetup: this.securityPluginSetup!,
      securityPluginStart: plugins.security,
      spacesPluginStart: plugins.spaces,
      featuresPluginStart: plugins.features,
      actionsPluginStart: plugins.actions,
      licensingPluginStart: plugins.licensing,
      /**
       * Lens will be always defined as
       * it is declared as required plugin in kibana.json
       */
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      lensEmbeddableFactory: this.lensEmbeddableFactory!,
      persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
      externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      notifications: plugins.notifications,
    });

    const client = core.elasticsearch.client;

    const getCasesClientWithRequest = async (request: KibanaRequest): Promise<CasesClient> => {
      return this.clientFactory.create({
        request,
        scopedClusterClient: client.asScoped(request).asCurrentUser,
        savedObjectsService: core.savedObjects,
      });
    };

    return {
      getCasesClientWithRequest,
    };
  }

  public stop() {
    this.logger.debug(`Stopping Case Workflow`);
  }

  private createRouteHandlerContext = ({
    core,
  }: {
    core: CoreSetup;
  }): IContextProvider<CasesRequestHandlerContext, 'cases'> => {
    return async (context, request, response) => {
      return {
        getCasesClient: async () => {
          const [{ savedObjects }] = await core.getStartServices();
          const coreContext = await context.core;

          return this.clientFactory.create({
            request,
            scopedClusterClient: coreContext.elasticsearch.client.asCurrentUser,
            savedObjectsService: savedObjects,
          });
        },
      };
    };
  };
}
