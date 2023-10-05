/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClient,
} from '@kbn/core/server';
import { isEmpty, mapValues } from 'lodash';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { alertsLocatorID } from '@kbn/observability-plugin/common';
import { APMConfig, APM_SERVER_FEATURE_ID } from '.';
import { APM_FEATURE, registerFeaturesUsage } from './feature';
import {
  registerApmRuleTypes,
  apmRuleTypeAlertFieldMap,
  APM_RULE_TYPE_ALERT_CONTEXT,
} from './routes/alerts/register_apm_rule_types';
import { registerFleetPolicyCallbacks } from './routes/fleet/register_fleet_policy_callbacks';
import { createApmTelemetry } from './lib/apm_telemetry';
import { getInternalSavedObjectsClient } from './lib/helpers/get_internal_saved_objects_client';
import { createApmAgentConfigurationIndex } from './routes/settings/agent_configuration/create_agent_config_index';
import { createApmCustomLinkIndex } from './routes/settings/custom_link/create_custom_link_index';
import {
  apmTelemetry,
  apmServerSettings,
  apmServiceGroups,
  apmCustomDashboards,
} from './saved_objects';
import {
  APMPluginSetup,
  APMPluginSetupDependencies,
  APMPluginStartDependencies,
} from './types';
import {
  APMRouteHandlerResources,
  registerRoutes,
} from './routes/apm_routes/register_apm_server_routes';
import { getGlobalApmServerRouteRepository } from './routes/apm_routes/get_global_apm_server_route_repository';
import { tutorialProvider } from './tutorial';
import { scheduleSourceMapMigration } from './routes/source_maps/schedule_source_map_migration';
import { createApmSourceMapIndexTemplate } from './routes/source_maps/create_apm_source_map_index_template';
import { addApiKeysToEveryPackagePolicyIfMissing } from './routes/fleet/api_keys/add_api_keys_to_policies_if_missing';
import { apmTutorialCustomIntegration } from '../common/tutorial/tutorials';
import { APM_STATIC_DATA_VIEW_ID } from '../common/data_view_constants';

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

    core.savedObjects.registerType(apmTelemetry);
    core.savedObjects.registerType(apmServerSettings);
    core.savedObjects.registerType(apmServiceGroups);
    core.savedObjects.registerType(apmCustomDashboards);

    const currentConfig = this.initContext.config.get<APMConfig>();
    this.currentConfig = currentConfig;

    if (
      plugins.taskManager &&
      plugins.usageCollection &&
      currentConfig.telemetryCollectionEnabled
    ) {
      createApmTelemetry({
        core,
        getApmIndices: plugins.apmDataAccess.getApmIndices,
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
      registrationContext: APM_RULE_TYPE_ALERT_CONTEXT,
      dataset: Dataset.alerts,
      componentTemplateRefs: [],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(apmRuleTypeAlertFieldMap, 'strict'),
        },
      ],
    });

    // ensure that the APM data view is globally available
    getCoreStart()
      .then(async (coreStart) => {
        const soClient = new SavedObjectsClient(
          coreStart.savedObjects.createInternalRepository()
        );

        await soClient.updateObjectsSpaces(
          [{ id: APM_STATIC_DATA_VIEW_ID, type: 'index-pattern' }],
          ['*'],
          []
        );
      })
      .catch((e) => {
        this.logger?.error(
          'Failed to make APM data view available globally',
          e
        );
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

    const apmIndicesPromise = (async () => {
      const coreStart = await getCoreStart();
      const soClient = await getInternalSavedObjectsClient(coreStart);
      const { getApmIndices } = plugins.apmDataAccess;
      return getApmIndices(soClient);
    })();

    // This if else block will go away in favour of removing Home Tutorial Integration
    // Ideally we will directly register a custom integration and pass the configs
    // for cloud, onPrem and Serverless so that the actual component can take
    // care of rendering
    if (currentConfig.serverlessOnboarding && plugins.customIntegrations) {
      plugins.customIntegrations?.registerCustomIntegration(
        apmTutorialCustomIntegration
      );
    } else {
      apmIndicesPromise.then((apmIndices) => {
        plugins.home?.tutorials.registerTutorial(
          tutorialProvider({
            apmConfig: currentConfig,
            apmIndices,
            cloud: plugins.cloud,
            isFleetPluginEnabled: !isEmpty(resourcePlugins.fleet),
          })
        );
      });
    }

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
      featureFlags: currentConfig.featureFlags,
      repository: getGlobalApmServerRouteRepository(),
      ruleDataClient,
      plugins: resourcePlugins,
      telemetryUsageCounter,
      kibanaVersion: this.initContext.env.packageInfo.version,
    });

    const { getApmIndices } = plugins.apmDataAccess;

    if (plugins.alerting) {
      registerApmRuleTypes({
        getApmIndices,
        alerting: plugins.alerting,
        basePath: core.http.basePath,
        apmConfig: currentConfig,
        logger: this.logger!.get('rule'),
        ml: plugins.ml,
        observability: plugins.observability,
        ruleDataClient,
        alertsLocator: plugins.share.url.locators.get(alertsLocatorID),
      });
    }

    registerFleetPolicyCallbacks({
      logger: this.logger,
      coreStartPromise: getCoreStart(),
      plugins: resourcePlugins,
    }).catch((e) => {
      this.logger?.error('Failed to register APM Fleet policy callbacks');
      this.logger?.error(e);
    });

    // This will add an API key to all existing APM package policies
    addApiKeysToEveryPackagePolicyIfMissing({
      coreStartPromise: getCoreStart(),
      pluginStartPromise: getPluginStart(),
      logger: this.logger,
    }).catch((e) => {
      this.logger?.error('Failed to add API keys to APM package policies');
      this.logger?.error(e);
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

    return { config$ };
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
  }

  public stop() {}
}
