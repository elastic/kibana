/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IContextProvider,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
} from '@kbn/core/server';
import { CoreSetup, CoreStart } from '@kbn/core/server';

import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  PluginStartContract as FeaturesPluginStart,
  PluginSetupContract as FeaturesPluginSetup,
} from '@kbn/features-plugin/server';
import { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { APP_ID } from '../common/constants';

import {
  createCaseCommentSavedObjectType,
  caseConfigureSavedObjectType,
  caseConnectorMappingsSavedObjectType,
  createCaseSavedObjectType,
  caseUserActionSavedObjectType,
  casesTelemetrySavedObjectType,
} from './saved_object_types';

import { CasesClient } from './client';
import type { CasesRequestHandlerContext } from './types';
import { CasesClientFactory } from './client/factory';
import { getCasesKibanaFeature } from './features';
import { registerRoutes } from './routes/api/register_routes';
import { getExternalRoutes } from './routes/api/get_external_routes';
import { createCasesTelemetry, scheduleCasesTelemetryTask } from './telemetry';
import { getInternalRoutes } from './routes/api/get_internal_routes';

export interface PluginsSetup {
  actions: ActionsPluginSetup;
  lens: LensServerPluginSetup;
  features: FeaturesPluginSetup;
  security?: SecurityPluginSetup;
  taskManager?: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
}

export interface PluginsStart {
  actions: ActionsPluginStart;
  features: FeaturesPluginStart;
  taskManager?: TaskManagerStartContract;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

/**
 * Cases server exposed contract for interacting with cases entities.
 */
export interface PluginStartContract {
  /**
   * Returns a client which can be used to interact with the cases backend entities.
   *
   * @param request a KibanaRequest
   * @returns a {@link CasesClient}
   */
  getCasesClientWithRequest(request: KibanaRequest): Promise<CasesClient>;
}

export class CasePlugin {
  private readonly logger: Logger;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private clientFactory: CasesClientFactory;
  private securityPluginSetup?: SecurityPluginSetup;
  private lensEmbeddableFactory?: LensServerPluginSetup['lensEmbeddableFactory'];

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.logger = this.initializerContext.logger.get();
    this.clientFactory = new CasesClientFactory(this.logger);
  }

  public setup(core: CoreSetup, plugins: PluginsSetup) {
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
          lensEmbeddableFactory: this.lensEmbeddableFactory,
        },
      })
    );
    core.savedObjects.registerType(caseConfigureSavedObjectType);
    core.savedObjects.registerType(caseConnectorMappingsSavedObjectType);
    core.savedObjects.registerType(createCaseSavedObjectType(core, this.logger));
    core.savedObjects.registerType(caseUserActionSavedObjectType);
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
      routes: [...getExternalRoutes(), ...getInternalRoutes()],
      logger: this.logger,
      kibanaVersion: this.kibanaVersion,
      telemetryUsageCounter,
    });
  }

  public start(core: CoreStart, plugins: PluginsStart): PluginStartContract {
    this.logger.debug(`Starting Case Workflow`);

    if (plugins.taskManager) {
      scheduleCasesTelemetryTask(plugins.taskManager, this.logger);
    }

    this.clientFactory.initialize({
      securityPluginSetup: this.securityPluginSetup,
      securityPluginStart: plugins.security,
      getSpace: async (request: KibanaRequest) => {
        return plugins.spaces?.spacesService.getActiveSpace(request);
      },
      featuresPluginStart: plugins.features,
      actionsPluginStart: plugins.actions,
      /**
       * Lens will be always defined as
       * it is declared as required plugin in kibana.json
       */
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      lensEmbeddableFactory: this.lensEmbeddableFactory!,
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

          return this.clientFactory.create({
            request,
            scopedClusterClient: context.core.elasticsearch.client.asCurrentUser,
            savedObjectsService: savedObjects,
          });
        },
      };
    };
  };
}
