/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';
import { mapValues, once } from 'lodash';
import { TECHNICAL_COMPONENT_TEMPLATE_NAME } from '../../rule_registry/common/assets';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';
import { RuleDataClient } from '../../rule_registry/server';
import { APMConfig, APMXPackConfig } from '.';
import { mergeConfigs } from './index';
import { UI_SETTINGS } from '../../../../src/plugins/data/common';
import { APM_FEATURE, registerFeaturesUsage } from './feature';
import { registerApmAlerts } from './lib/alerts/register_apm_alerts';
import { registerFleetPolicyCallbacks } from './lib/fleet/register_fleet_policy_callbacks';
import { createApmTelemetry } from './lib/apm_telemetry';
import { createApmEventClient } from './lib/helpers/create_es_client/create_apm_event_client';
import { getInternalSavedObjectsClient } from './lib/helpers/get_internal_saved_objects_client';
import { createApmAgentConfigurationIndex } from './lib/settings/agent_configuration/create_agent_config_index';
import { getApmIndices } from './lib/settings/apm_indices/get_apm_indices';
import { createApmCustomLinkIndex } from './lib/settings/custom_link/create_custom_link_index';
import { apmIndices, apmTelemetry } from './saved_objects';
import { uiSettings } from './ui_settings';
import type {
  ApmPluginRequestHandlerContext,
  APMRouteHandlerResources,
} from './routes/typings';
import {
  APMPluginSetup,
  APMPluginSetupDependencies,
  APMPluginStartDependencies,
} from './types';
import { registerRoutes } from './routes/register_routes';
import { getGlobalApmServerRouteRepository } from './routes/get_global_apm_server_route_repository';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../common/elasticsearch_fieldnames';
import { tutorialProvider } from './tutorial';

export class APMPlugin
  implements
    Plugin<
      APMPluginSetup,
      void,
      APMPluginSetupDependencies,
      APMPluginStartDependencies
    > {
  private currentConfig?: APMConfig;
  private logger?: Logger;
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(
    core: CoreSetup<APMPluginStartDependencies>,
    plugins: Omit<APMPluginSetupDependencies, 'core'>
  ) {
    this.logger = this.initContext.logger.get();
    const config$ = this.initContext.config.create<APMXPackConfig>();
    const mergedConfig$ = combineLatest(plugins.apmOss.config$, config$).pipe(
      map(([apmOssConfig, apmConfig]) => mergeConfigs(apmOssConfig, apmConfig))
    );

    core.savedObjects.registerType(apmIndices);
    core.savedObjects.registerType(apmTelemetry);

    core.uiSettings.register(uiSettings);

    const currentConfig = mergeConfigs(
      plugins.apmOss.config,
      this.initContext.config.get<APMXPackConfig>()
    );

    this.currentConfig = currentConfig;

    if (
      plugins.taskManager &&
      plugins.usageCollection &&
      this.currentConfig['xpack.apm.telemetryCollectionEnabled']
    ) {
      createApmTelemetry({
        core,
        config$: mergedConfig$,
        usageCollector: plugins.usageCollection,
        taskManager: plugins.taskManager,
        logger: this.logger,
        kibanaVersion: this.initContext.env.packageInfo.version,
      });
    }

    plugins.home?.tutorials.registerTutorial(
      tutorialProvider({
        isEnabled: this.currentConfig['xpack.apm.ui.enabled'],
        indexPatternTitle: this.currentConfig['apm_oss.indexPattern'],
        cloud: plugins.cloud,
        indices: {
          errorIndices: this.currentConfig['apm_oss.errorIndices'],
          metricsIndices: this.currentConfig['apm_oss.metricsIndices'],
          onboardingIndices: this.currentConfig['apm_oss.onboardingIndices'],
          sourcemapIndices: this.currentConfig['apm_oss.sourcemapIndices'],
          transactionIndices: this.currentConfig['apm_oss.transactionIndices'],
        },
      })
    );

    plugins.features.registerKibanaFeature(APM_FEATURE);

    registerFeaturesUsage({ licensingPlugin: plugins.licensing });

    const { ruleDataService } = plugins.ruleRegistry;
    const getCoreStart = () =>
      core.getStartServices().then(([coreStart]) => coreStart);

    const ready = once(async () => {
      const componentTemplateName = ruleDataService.getFullAssetName(
        'apm-mappings'
      );

      if (!ruleDataService.isWriteEnabled()) {
        return;
      }

      await ruleDataService.createOrUpdateComponentTemplate({
        name: componentTemplateName,
        body: {
          template: {
            settings: {
              number_of_shards: 1,
            },
            mappings: mappingFromFieldMap({
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
            }),
          },
        },
      });

      await ruleDataService.createOrUpdateIndexTemplate({
        name: ruleDataService.getFullAssetName('apm-index-template'),
        body: {
          index_patterns: [
            ruleDataService.getFullAssetName('observability-apm*'),
          ],
          composed_of: [
            ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
            componentTemplateName,
          ],
        },
      });
    });

    ready().catch((err) => {
      this.logger!.error(err);
    });

    const ruleDataClient = new RuleDataClient({
      alias: ruleDataService.getFullAssetName('observability-apm'),
      getClusterClient: async () => {
        const coreStart = await getCoreStart();
        return coreStart.elasticsearch.client.asInternalUser;
      },
      ready,
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
    });

    const boundGetApmIndices = async () =>
      getApmIndices({
        savedObjectsClient: await getInternalSavedObjectsClient(core),
        config: await mergedConfig$.pipe(take(1)).toPromise(),
      });

    if (plugins.alerting) {
      registerApmAlerts({
        ruleDataClient,
        alerting: plugins.alerting,
        ml: plugins.ml,
        config$: mergedConfig$,
        logger: this.logger!.get('rule'),
      });
    }

    registerFleetPolicyCallbacks({
      plugins: resourcePlugins,
      ruleDataClient,
      config: this.currentConfig,
      logger: this.logger,
    });

    return {
      config$: mergedConfig$,
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
        const [indices, includeFrozen] = await Promise.all([
          boundGetApmIndices(),
          context.core.uiSettings.client.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
        ]);

        const esClient = context.core.elasticsearch.client.asCurrentUser;

        return createApmEventClient({
          debug: debug ?? false,
          esClient,
          request,
          indices,
          options: {
            includeFrozen,
          },
        });
      },
    };
  }

  public start(core: CoreStart) {
    if (this.currentConfig == null || this.logger == null) {
      throw new Error('APMPlugin needs to be setup before calling start()');
    }

    // create agent configuration index without blocking start lifecycle
    createApmAgentConfigurationIndex({
      client: core.elasticsearch.client.asInternalUser,
      config: this.currentConfig,
      logger: this.logger,
    });
    // create custom action index without blocking start lifecycle
    createApmCustomLinkIndex({
      client: core.elasticsearch.client.asInternalUser,
      config: this.currentConfig,
      logger: this.logger,
    });
  }

  public stop() {}
}
