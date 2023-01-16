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
  Ecs,
} from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { orderBy } from 'lodash';
import deepequal from 'fast-deep-equal';

import type { NewPackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import type { PackSavedObjectAttributes } from './common/types';
import { updateGlobalPacksCreateCallback } from './lib/update_global_packs';
import { packSavedObjectType } from '../common/types';
import type { CreateLiveQueryRequestBodySchema } from '../common/schemas/routes/live_query';
import { createConfig } from './create_config';
import type { OsqueryPluginSetup, OsqueryPluginStart, SetupPlugins, StartPlugins } from './types';
import { defineRoutes } from './routes';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
import { initSavedObjects } from './saved_objects';
import { initUsageCollectors } from './usage';
import type { OsqueryAppContext } from './lib/osquery_app_context_services';
import { OsqueryAppContextService } from './lib/osquery_app_context_services';
import type { ConfigType } from '../common/config';
import { OSQUERY_INTEGRATION_NAME } from '../common';
import {
  getPackagePolicyDeleteCallback,
  getPackagePolicyUpdateCallback,
} from './lib/fleet_integration';
import { TelemetryEventsSender } from './lib/telemetry/sender';
import { TelemetryReceiver } from './lib/telemetry/receiver';
import { initializeTransformsIndices } from './create_indices/create_transforms_indices';
import { initializeTransforms } from './create_transforms/create_transforms';
import { createDataViews } from './create_data_views';
import { createActionHandler } from './handlers/action';

import { registerFeatures } from './utils/register_features';

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private readonly logger: Logger;
  private context: PluginInitializerContext;
  private readonly osqueryAppContextService = new OsqueryAppContextService();
  private readonly telemetryReceiver: TelemetryReceiver;
  private readonly telemetryEventsSender: TelemetryEventsSender;

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

    core.getStartServices().then(([{ elasticsearch }, depsStart]) => {
      const osquerySearchStrategy = osquerySearchStrategyProvider(
        depsStart.data,
        elasticsearch.client
      );

      plugins.data.search.registerSearchStrategy('osquerySearchStrategy', osquerySearchStrategy);
      defineRoutes(router, osqueryContext);
    });

    this.telemetryEventsSender.setup(this.telemetryReceiver, plugins.taskManager, core.analytics);

    return {
      osqueryCreateAction: (params: CreateLiveQueryRequestBodySchema, ecsData?: Ecs) =>
        createActionHandler(osqueryContext, params, { ecsData }),
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

      try {

        // First get all datastreams matching the pattern.
        const dataStreams = await esClient.indices.getDataStream({
          name: `logs-${OSQUERY_INTEGRATION_NAME}.result-*`,
        });

        // Then for each of those datastreams, we need to see if they need to rollover.
        await dataStreams.data_streams.forEach(async dataStream => {
          const mapping = await esClient.indices.getMapping({
            index: dataStream.name,
          });

          // TODO: This sort doesn't look like its working right now.
          // Sort by index name to get the latest index
          const dataStreamMapping = orderBy(Object.entries(mapping), [0], 'desc')?.[0][1]?.mappings
          ?.properties?.data_stream;

          if (
            dataStreamMapping &&
            deepequal(dataStreamMapping, {
              properties: {
                dataset: {
                  type: 'constant_keyword',
                  value: 'generic',  // We can just check for this value most likely.  It will signify that an osquery beat wrote the wrong data
                },
                namespace: {
                  type: 'constant_keyword',
                  value: 'default',  // This would need to be datastream specific to make sure it's the right namespace.  I think we can drop this comparison and just check dataset above.
                },
                type: {
                  type: 'constant_keyword',
                  value: 'osquery',
                },
              },
            })
          )
    
          await esClient.indices.rollover({
            alias: dataStream.name,
          });

        });
      } catch(e) {
        this.logger.info(e);
      }

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


        //registerIngestCallback('packagePolicyUpdate', getPackagePolicyUpdateCallback(esClient, this.logger));

        registerIngestCallback('packagePolicyPostDelete', getPackagePolicyDeleteCallback(client, this.logger));
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
