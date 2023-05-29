/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { NewPackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';

import type { Subscription } from 'rxjs';
import { upgradeIntegration } from './utils/upgrade_integration';
import type { PackSavedObjectAttributes } from './common/types';
import { updateGlobalPacksCreateCallback } from './lib/update_global_packs';
import { packSavedObjectType } from '../common/types';
import { createConfig } from './create_config';
import type { OsqueryPluginSetup, OsqueryPluginStart, SetupPlugins, StartPlugins } from './types';
import { defineRoutes } from './routes';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
import { initSavedObjects } from './saved_objects';
import type { OsqueryAppContext } from './lib/osquery_app_context_services';
import { OsqueryAppContextService } from './lib/osquery_app_context_services';
import type { ConfigType } from '../common/config';
import { OSQUERY_INTEGRATION_NAME } from '../common';
import { getPackagePolicyDeleteCallback } from './lib/fleet_integration';
import { TelemetryEventsSender } from './lib/telemetry/sender';
import { TelemetryReceiver } from './lib/telemetry/receiver';
import { initializeTransformsIndices } from './create_indices/create_transforms_indices';
import { initializeTransforms } from './create_transforms/create_transforms';
import { createDataViews } from './create_data_views';

import { registerFeatures } from './utils/register_features';
import { CASE_ATTACHMENT_TYPE_ID } from '../common/constants';
import { createActionService } from './handlers/action/create_action_service';

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private readonly logger: Logger;
  private context: PluginInitializerContext;
  private readonly osqueryAppContextService = new OsqueryAppContextService();
  private readonly telemetryReceiver: TelemetryReceiver;
  private readonly telemetryEventsSender: TelemetryEventsSender;
  private licenseSubscription: Subscription | null = null;
  private createActionService: ReturnType<typeof createActionService> | null = null;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.context = initializerContext;
    this.logger = initializerContext.logger.get();
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
    this.telemetryReceiver = new TelemetryReceiver(this.logger);
  }

  public setup(core: CoreSetup<StartPlugins, OsqueryPluginStart>, plugins: SetupPlugins) {
    this.logger.debug('osquery: Setup');
    const config = createConfig(this.initializerContext);

    registerFeatures(plugins.features);

    const router = core.http.createRouter<DataRequestHandlerContext>();

    const osqueryContext: OsqueryAppContext = {
      logFactory: this.context.logger,
      getStartServices: core.getStartServices,
      service: this.osqueryAppContextService,
      config: (): ConfigType => config,
      security: plugins.security,
      telemetryEventsSender: this.telemetryEventsSender,
      licensing: plugins.licensing,
    };

    initSavedObjects(core.savedObjects);

    this.createActionService = createActionService(osqueryContext);

    core.getStartServices().then(([{ elasticsearch }, depsStart]) => {
      const osquerySearchStrategy = osquerySearchStrategyProvider(
        depsStart.data,
        elasticsearch.client
      );

      plugins.data.search.registerSearchStrategy('osquerySearchStrategy', osquerySearchStrategy);
      defineRoutes(router, osqueryContext);
    });

    this.telemetryEventsSender.setup(this.telemetryReceiver, plugins.taskManager, core.analytics);

    plugins.cases.attachmentFramework.registerExternalReference({ id: CASE_ATTACHMENT_TYPE_ID });

    return {
      createActionService: this.createActionService,
    };
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    this.logger.debug('osquery: Started');
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;

    this.osqueryAppContextService.start({
      ...plugins.fleet,
      ruleRegistryService: plugins.ruleRegistry,
      // @ts-expect-error update types
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config: this.config!,
      logger: this.logger,
      registerIngestCallback,
    });

    this.telemetryReceiver.start(core, this.osqueryAppContextService);

    this.telemetryEventsSender.start(plugins.taskManager, this.telemetryReceiver);

    plugins.fleet?.fleetSetupCompleted().then(async () => {
      const packageInfo = await plugins.fleet?.packageService.asInternalUser.getInstallation(
        OSQUERY_INTEGRATION_NAME
      );
      const client = new SavedObjectsClient(core.savedObjects.createInternalRepository());

      const esClient = core.elasticsearch.client.asInternalUser;
      const dataViewsService = await plugins.dataViews.dataViewsServiceFactory(
        client,
        esClient,
        undefined,
        true
      );

      // If package is installed we want to make sure all needed assets are installed
      if (packageInfo) {
        await this.initialize(core, dataViewsService);
      }

      // Upgrade integration into 1.6.0 and rollover if found 'generic' dataset - we do not want to wait for it
      upgradeIntegration({ packageInfo, client, esClient, logger: this.logger });

      if (registerIngestCallback) {
        registerIngestCallback(
          'packagePolicyCreate',
          async (newPackagePolicy: NewPackagePolicy): Promise<UpdatePackagePolicy> => {
            if (newPackagePolicy.package?.name === OSQUERY_INTEGRATION_NAME) {
              await this.initialize(core, dataViewsService);

              const allPacks = await client.find<PackSavedObjectAttributes>({
                type: packSavedObjectType,
              });

              if (allPacks.saved_objects) {
                return updateGlobalPacksCreateCallback(
                  newPackagePolicy,
                  client,
                  allPacks,
                  this.osqueryAppContextService
                );
              }
            }

            return newPackagePolicy;
          }
        );

        registerIngestCallback('packagePolicyPostDelete', getPackagePolicyDeleteCallback(client));
      }
    });

    return {};
  }

  public stop() {
    this.logger.debug('osquery: Stopped');
    this.telemetryEventsSender.stop();
    this.osqueryAppContextService.stop();
    this.licenseSubscription?.unsubscribe();
    this.createActionService?.stop();
  }

  async initialize(core: CoreStart, dataViewsService: DataViewsService): Promise<void> {
    this.logger.debug('initialize');
    await initializeTransformsIndices(core.elasticsearch.client.asInternalUser, this.logger);
    await initializeTransforms(core.elasticsearch.client.asInternalUser, this.logger);
    await createDataViews(dataViewsService);
  }
}
