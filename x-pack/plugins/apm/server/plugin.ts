/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { isEmpty, mapValues } from 'lodash';
import { mappingFromFieldMap } from '@kbn/rule-registry-plugin/common/mapping_from_field_map';
import { experimentalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/experimental_rule_field_map';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { APMConfig, APM_SERVER_FEATURE_ID } from '.';
import { APM_FEATURE, registerFeaturesUsage } from './feature';
import { registerApmRuleTypes } from './routes/alerts/register_apm_rule_types';
import { registerFleetPolicyCallbacks } from './routes/fleet/register_fleet_policy_callbacks';
import { createApmTelemetry } from './lib/apm_telemetry';
import { APMEventClient } from './lib/helpers/create_es_client/create_apm_event_client';
import { getInternalSavedObjectsClient } from './lib/helpers/get_internal_saved_objects_client';
import { createApmAgentConfigurationIndex } from './routes/settings/agent_configuration/create_agent_config_index';
import { getApmIndices } from './routes/settings/apm_indices/get_apm_indices';
import { createApmCustomLinkIndex } from './routes/settings/custom_link/create_custom_link_index';
import {
  apmIndices,
  apmTelemetry,
  apmServerSettings,
  apmServiceGroups,
} from './saved_objects';
import type {
  ApmPluginRequestHandlerContext,
  APMRouteHandlerResources,
} from './routes/typings';
import {
  APMPluginSetup,
  APMPluginSetupDependencies,
  APMPluginStartDependencies,
} from './types';
import { registerRoutes } from './routes/apm_routes/register_apm_server_routes';
import { getGlobalApmServerRouteRepository } from './routes/apm_routes/get_global_apm_server_route_repository';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  AGENT_NAME,
  SERVICE_LANGUAGE_NAME,
} from '../common/es_fields/apm';
import { tutorialProvider } from './tutorial';
import { migrateLegacyAPMIndicesToSpaceAware } from './saved_objects/migrations/migrate_legacy_apm_indices_to_space_aware';
import { scheduleSourceMapMigration } from './routes/source_maps/schedule_source_map_migration';
import { createApmSourceMapIndexTemplate } from './routes/source_maps/create_apm_source_map_index_template';
import { addApiKeysToEveryPackagePolicyIfMissing } from './routes/fleet/api_keys/add_api_keys_to_policies_if_missing';

export class APMPlugin
  implements
    Plugin<
      APMPluginSetup,
      void,
      APMPluginSetupDependencies,
      APMPluginStartDependencies
    >
{
  private currentConfig?: APMConfig;
  private logger?: Logger;
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(
    core: CoreSetup<APMPluginStartDependencies>,
    plugins: APMPluginSetupDependencies
  ) {
    this.logger = this.initContext.logger.get();
    const config$ = this.initContext.config.create<APMConfig>();

    core.savedObjects.registerType(apmIndices);
    core.savedObjects.registerType(apmTelemetry);
    core.savedObjects.registerType(apmServerSettings);
    core.savedObjects.registerType(apmServiceGroups);

    const currentConfig = this.initContext.config.get<APMConfig>();
    this.currentConfig = currentConfig;

    if (
      plugins.taskManager &&
      plugins.usageCollection &&
      currentConfig.telemetryCollectionEnabled
    ) {
      createApmTelemetry({
        core,
        config: currentConfig,
        usageCollector: plugins.usageCollection,
        taskManager: plugins.taskManager,
        logger: this.logger,
        kibanaVersion: this.initContext.env.packageInfo.version,
        isProd: this.initContext.env.mode.prod,
      });
    }

    plugins.features.registerKibanaFeature(APM_FEATURE);

    registerFeaturesUsage({ licensingPlugin: plugins.licensing });

    const getCoreStart = () =>
      core.getStartServices().then(([coreStart]) => coreStart);

    const getPluginStart = () =>
      core.getStartServices().then(([coreStart, pluginStart]) => pluginStart);

    const { ruleDataService } = plugins.ruleRegistry;
    const ruleDataClient = ruleDataService.initializeIndex({
      feature: APM_SERVER_FEATURE_ID,
      registrationContext: 'observability.apm',
      dataset: Dataset.alerts,
      componentTemplateRefs: [],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(
            {
              ...experimentalRuleFieldMap,
              [SERVICE_NAME]: {
                type: 'keyword',
              },
              [SERVICE_ENVIRONMENT]: {
                type: 'keyword',
              },
              [TRANSACTION_TYPE]: {
                type: 'keyword',
              },
              [PROCESSOR_EVENT]: {
                type: 'keyword',
              },
              [AGENT_NAME]: {
                type: 'keyword',
              },
              [SERVICE_LANGUAGE_NAME]: {
                type: 'keyword',
              },
              labels: {
                type: 'object',
                dynamic: true,
              },
            },
            'strict'
          ),
        },
      ],
    });

    const resourcePlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof APMPluginStartDependencies
            ];
          }),
      };
    }) as APMRouteHandlerResources['plugins'];

    const boundGetApmIndices = async () => {
      const coreStart = await getCoreStart();
      return getApmIndices({
        savedObjectsClient: await getInternalSavedObjectsClient(coreStart),
        config: await firstValueFrom(config$),
      });
    };

    boundGetApmIndices().then((indices) => {
      plugins.home?.tutorials.registerTutorial(
        tutorialProvider({
          apmConfig: currentConfig,
          apmIndices: indices,
          cloud: plugins.cloud,
          isFleetPluginEnabled: !isEmpty(resourcePlugins.fleet),
        })
      );
    });

    const telemetryUsageCounter =
      resourcePlugins.usageCollection?.setup.createUsageCounter(
        APM_SERVER_FEATURE_ID
      );

    registerRoutes({
      core: {
        setup: core,
        start: getCoreStart,
      },
      logger: this.logger,
      config: currentConfig,
      repository: getGlobalApmServerRouteRepository(),
      ruleDataClient,
      plugins: resourcePlugins,
      telemetryUsageCounter,
      kibanaVersion: this.initContext.env.packageInfo.version,
    });

    if (plugins.alerting) {
      registerApmRuleTypes({
        alerting: plugins.alerting,
        basePath: core.http.basePath,
        config$,
        logger: this.logger!.get('rule'),
        ml: plugins.ml,
        observability: plugins.observability,
        ruleDataClient,
      });
    }

    registerFleetPolicyCallbacks({
      logger: this.logger,
      coreStartPromise: getCoreStart(),
      plugins: resourcePlugins,
      config: currentConfig,
    });

    // This will add an API key to all existing APM package policies
    addApiKeysToEveryPackagePolicyIfMissing({
      coreStartPromise: getCoreStart(),
      pluginStartPromise: getPluginStart(),
      logger: this.logger,
    });

    const taskManager = plugins.taskManager;

    // create source map index and run migrations
    scheduleSourceMapMigration({
      coreStartPromise: getCoreStart(),
      pluginStartPromise: getPluginStart(),
      taskManager,
      logger: this.logger,
    }).catch((e) => {
      this.logger?.error('Failed to schedule APM source map migration');
      this.logger?.error(e);
    });

    return {
      config$,
      getApmIndices: boundGetApmIndices,
      createApmEventClient: async ({
        request,
        context,
        debug,
      }: {
        debug?: boolean;
        request: KibanaRequest;
        context: ApmPluginRequestHandlerContext;
      }) => {
        const coreContext = await context.core;
        const [indices, includeFrozen] = await Promise.all([
          boundGetApmIndices(),
          coreContext.uiSettings.client.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
        ]);

        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        return new APMEventClient({
          debug: debug ?? false,
          esClient,
          request,
          indices,
          options: {
            includeFrozen,
            forceSyntheticSource: currentConfig.forceSyntheticSource,
          },
        });
      },
    };
  }

  public start(core: CoreStart, plugins: APMPluginStartDependencies) {
    if (this.currentConfig == null || this.logger == null) {
      throw new Error('APMPlugin needs to be setup before calling start()');
    }

    const logger = this.logger;
    const client = core.elasticsearch.client.asInternalUser;

    // create .apm-agent-configuration index without blocking start lifecycle
    createApmAgentConfigurationIndex({ client, logger }).catch((e) => {
      logger.error('Failed to create .apm-agent-configuration index');
      logger.error(e);
    });

    // create .apm-custom-link index without blocking start lifecycle
    createApmCustomLinkIndex({ client, logger }).catch((e) => {
      logger.error('Failed to create .apm-custom-link index');
      logger.error(e);
    });

    // create .apm-source-map index without blocking start lifecycle
    createApmSourceMapIndexTemplate({ client, logger }).catch((e) => {
      logger.error('Failed to create apm-source-map index template');
      logger.error(e);
    });

    // TODO: remove in 9.0
    migrateLegacyAPMIndicesToSpaceAware({ coreStart: core, logger }).catch(
      (e) => {
        logger.error('Failed to run migration making APM indices space aware');
        logger.error(e);
      }
    );
  }

  public stop() {}
}
