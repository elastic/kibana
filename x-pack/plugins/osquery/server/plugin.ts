/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES, SavedObjectsClient } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';

import { createConfig } from './create_config';
import type { OsqueryPluginSetup, OsqueryPluginStart, SetupPlugins, StartPlugins } from './types';
import { defineRoutes } from './routes';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
import { initSavedObjects } from './saved_objects';
import { initUsageCollectors } from './usage';
import type { OsqueryAppContext } from './lib/osquery_app_context_services';
import { OsqueryAppContextService } from './lib/osquery_app_context_services';
import type { ConfigType } from './config';
import {
  packSavedObjectType,
  packAssetSavedObjectType,
  savedQuerySavedObjectType,
} from '../common/types';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../common';
import { getPackagePolicyDeleteCallback } from './lib/fleet_integration';
import { TelemetryEventsSender } from './lib/telemetry/sender';
import { TelemetryReceiver } from './lib/telemetry/receiver';
import { initializeTransformsIndices } from './create_indices/create_transforms_indices';
import { initializeTransforms } from './create_transforms/create_transforms';
import { createDataViews } from './create_data_views';

const registerFeatures = (features: SetupPlugins['features']) => {
  features.registerKibanaFeature({
    id: PLUGIN_ID,
    name: i18n.translate('xpack.osquery.features.osqueryFeatureName', {
      defaultMessage: 'Osquery',
    }),
    category: DEFAULT_APP_CATEGORIES.management,
    app: [PLUGIN_ID, 'kibana'],
    catalogue: [PLUGIN_ID],
    order: 2300,
    privileges: {
      all: {
        api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-write`],
        app: [PLUGIN_ID, 'kibana'],
        catalogue: [PLUGIN_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: ['write'],
      },
      read: {
        api: [`${PLUGIN_ID}-read`],
        app: [PLUGIN_ID, 'kibana'],
        catalogue: [PLUGIN_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: ['read'],
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.osquery.features.liveQueriesSubFeatureName', {
          defaultMessage: 'Live queries',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [`${PLUGIN_ID}-writeLiveQueries`, `${PLUGIN_ID}-readLiveQueries`],
                id: 'live_queries_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['writeLiveQueries', 'readLiveQueries'],
              },
              {
                api: [`${PLUGIN_ID}-readLiveQueries`],
                id: 'live_queries_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['readLiveQueries'],
              },
            ],
          },
          {
            groupType: 'independent',
            privileges: [
              {
                api: [`${PLUGIN_ID}-runSavedQueries`],
                id: 'run_saved_queries',
                name: i18n.translate('xpack.osquery.features.runSavedQueriesPrivilegeName', {
                  defaultMessage: 'Run Saved queries',
                }),
                includeIn: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['runSavedQueries'],
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.osquery.features.savedQueriesSubFeatureName', {
          defaultMessage: 'Saved queries',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [`${PLUGIN_ID}-writeSavedQueries`, `${PLUGIN_ID}-readSavedQueries`],
                id: 'saved_queries_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [savedQuerySavedObjectType],
                  read: [],
                },
                ui: ['writeSavedQueries', 'readSavedQueries'],
              },
              {
                api: [`${PLUGIN_ID}-readSavedQueries`],
                id: 'saved_queries_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [savedQuerySavedObjectType],
                },
                ui: ['readSavedQueries'],
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.osquery.features.packsSubFeatureName', {
          defaultMessage: 'Packs',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [`${PLUGIN_ID}-writePacks`, `${PLUGIN_ID}-readPacks`],
                id: 'packs_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [packSavedObjectType, packAssetSavedObjectType],
                  read: [],
                },
                ui: ['writePacks', 'readPacks'],
              },
              {
                api: [`${PLUGIN_ID}-readPacks`],
                id: 'packs_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [packSavedObjectType],
                },
                ui: ['readPacks'],
              },
            ],
          },
        ],
      },
    ],
  });
};

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private readonly logger: Logger;
  private context: PluginInitializerContext;
  private readonly osqueryAppContextService = new OsqueryAppContextService();
  private readonly telemetryReceiver: TelemetryReceiver;
  private readonly telemetryEventsSender: TelemetryEventsSender;

  private telemetryUsageCounter?: UsageCounter;

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
    };

    initSavedObjects(core.savedObjects);
    initUsageCollectors({
      core,
      osqueryContext,
      usageCollection: plugins.usageCollection,
    });

    this.telemetryUsageCounter = plugins.usageCollection?.createUsageCounter(PLUGIN_ID);

    core.getStartServices().then(([{ elasticsearch }, depsStart]) => {
      const osquerySearchStrategy = osquerySearchStrategyProvider(
        depsStart.data,
        elasticsearch.client
      );

      plugins.data.search.registerSearchStrategy('osquerySearchStrategy', osquerySearchStrategy);
      defineRoutes(router, osqueryContext);
    });

    this.telemetryEventsSender.setup(
      this.telemetryReceiver,
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryUsageCounter
    );

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    this.logger.debug('osquery: Started');
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;

    this.osqueryAppContextService.start({
      ...plugins.fleet,
      // @ts-expect-error update types
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config: this.config!,
      logger: this.logger,
      registerIngestCallback,
    });

    this.telemetryReceiver.start(core, this.osqueryAppContextService);

    this.telemetryEventsSender.start(
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryReceiver
    );

    plugins.fleet?.fleetSetupCompleted().then(async () => {
      const packageInfo = await plugins.fleet?.packageService.asInternalUser.getInstallation(
        OSQUERY_INTEGRATION_NAME
      );
      const client = new SavedObjectsClient(core.savedObjects.createInternalRepository());

      const dataViewsService = await plugins.dataViews.dataViewsServiceFactory(
        client,
        core.elasticsearch.client.asInternalUser,
        undefined,
        true
      );

      // If package is installed we want to make sure all needed assets are installed
      if (packageInfo) {
        await this.initialize(core, dataViewsService);
      }

      if (registerIngestCallback) {
        registerIngestCallback(
          'packagePolicyPostCreate',
          async (packagePolicy: PackagePolicy): Promise<PackagePolicy> => {
            if (packagePolicy.package?.name === OSQUERY_INTEGRATION_NAME) {
              await this.initialize(core, dataViewsService);
            }

            return packagePolicy;
          }
        );

        registerIngestCallback('postPackagePolicyDelete', getPackagePolicyDeleteCallback(client));
      }
    });

    return {};
  }

  public stop() {
    this.logger.debug('osquery: Stopped');
    this.telemetryEventsSender.stop();
    this.osqueryAppContextService.stop();
  }

  async initialize(core: CoreStart, dataViewsService: DataViewsService): Promise<void> {
    this.logger.debug('initialize');
    await initializeTransformsIndices(core.elasticsearch.client.asInternalUser, this.logger);
    await initializeTransforms(core.elasticsearch.client.asInternalUser, this.logger);
    await createDataViews(dataViewsService);
  }
}
