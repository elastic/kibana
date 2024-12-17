/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { alertsLocatorID } from '@kbn/observability-plugin/common';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { isEmpty, mapValues } from 'lodash';
import { APMConfig, APM_SERVER_FEATURE_ID } from '.';
import { apmTutorialCustomIntegration } from '../common/tutorial/tutorials';
import { registerAssistantFunctions } from './assistant_functions';
import { registerDeprecations } from './deprecations';
import { APM_FEATURE, registerFeaturesUsage } from './feature';
import { createApmTelemetry } from './lib/apm_telemetry';
import { getInternalSavedObjectsClient } from './lib/helpers/get_internal_saved_objects_client';
import {
  APM_RULE_TYPE_ALERT_CONTEXT,
  apmRuleTypeAlertFieldMap,
  registerApmRuleTypes,
} from './routes/alerts/register_apm_rule_types';
import { getGlobalApmServerRouteRepository } from './routes/apm_routes/get_global_apm_server_route_repository';
import {
  APMRouteHandlerResources,
  registerRoutes,
} from './routes/apm_routes/register_apm_server_routes';
import { getAlertDetailsContextHandler } from './routes/assistant_functions/get_observability_alert_details_context';
import { registerDataDefinitions } from './data_definitions';
import { addApiKeysToEveryPackagePolicyIfMissing } from './routes/fleet/api_keys/add_api_keys_to_policies_if_missing';
import { registerFleetPolicyCallbacks } from './routes/fleet/register_fleet_policy_callbacks';
import { createApmAgentConfigurationIndex } from './routes/settings/agent_configuration/create_agent_config_index';
import { createApmCustomLinkIndex } from './routes/settings/custom_link/create_custom_link_index';
import { createApmSourceMapIndexTemplate } from './routes/source_maps/create_apm_source_map_index_template';
import { scheduleSourceMapMigration } from './routes/source_maps/schedule_source_map_migration';
import {
  apmCustomDashboards,
  apmServerSettings,
  apmServiceGroups,
  apmTelemetry,
} from './saved_objects';
import { tutorialProvider } from './tutorial';
import { APMPluginSetup, APMPluginSetupDependencies, APMPluginStartDependencies } from './types';

export class APMPlugin
  implements Plugin<APMPluginSetup, void, APMPluginSetupDependencies, APMPluginStartDependencies>
{
  private currentConfig?: APMConfig;
  private logger?: Logger;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(core: CoreSetup<APMPluginStartDependencies>, plugins: APMPluginSetupDependencies) {
    const logger = (this.logger = this.initContext.logger.get());
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
      }).catch(() => {});
    }

    plugins.features.registerKibanaFeature(APM_FEATURE);

    registerFeaturesUsage({ licensingPlugin: plugins.licensing });

    const getCoreStart = () => core.getStartServices().then(([coreStart]) => coreStart);

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

    const resourcePlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[key as keyof APMPluginStartDependencies];
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
      plugins.customIntegrations?.registerCustomIntegration(apmTutorialCustomIntegration);
    } else {
      apmIndicesPromise
        .then((apmIndices) => {
          plugins.home?.tutorials.registerTutorial(
            tutorialProvider({
              apmConfig: currentConfig,
              apmIndices,
              cloud: plugins.cloud,
              isFleetPluginEnabled: !isEmpty(resourcePlugins.fleet),
            })
          );
        })
        .catch(() => {});
    }

    const telemetryUsageCounter =
      resourcePlugins.usageCollection?.setup.createUsageCounter(APM_SERVER_FEATURE_ID);

    const kibanaVersion = this.initContext.env.packageInfo.version;

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
      kibanaVersion,
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

    registerDataDefinitions({
      plugins,
      coreSetup: core,
    });

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

    plugins.observabilityAIAssistant?.service.register(
      registerAssistantFunctions({
        config: this.currentConfig!,
        coreSetup: core,
        featureFlags: this.currentConfig!.featureFlags,
        kibanaVersion,
        logger: this.logger.get('assistant'),
        plugins: resourcePlugins,
        ruleDataClient,
      })
    );

    plugins.observability.alertDetailsContextualInsightsService.registerHandler(
      getAlertDetailsContextHandler(resourcePlugins, logger)
    );

    registerDeprecations({
      core,
      apmDeps: {
        logger: this.logger,
        security: plugins.security,
      },
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
