/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract, PluginStartContract } from '@kbn/alerting-plugin/server';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import {
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { LogsExplorerLocatorParams, LOGS_EXPLORER_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';
import { i18n } from '@kbn/i18n';
import {
  ApmRuleType,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '@kbn/rule-data-utils';
import { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { ObservabilityConfig } from '.';
import { observabilityFeatureId } from '../common';
import {
  kubernetesGuideConfig,
  kubernetesGuideId,
} from '../common/guided_onboarding/kubernetes_guide_config';
import { AlertsLocatorDefinition } from '../common/locators/alerts';
import {
  AnnotationsAPI,
  bootstrapAnnotations,
  ScopedAnnotationsClientFactory,
} from './lib/annotations/bootstrap_annotations';
import { registerRuleTypes } from './lib/rules/register_rule_types';
import { getObservabilityServerRouteRepository } from './routes/get_global_observability_server_route_repository';
import { registerRoutes } from './routes/register_routes';
import { threshold } from './saved_objects/threshold';
import { AlertDetailsContextualInsightsService } from './services';
import { uiSettings } from './ui_settings';
import { getCasesFeature } from './features/cases_v1';
import { getCasesFeatureV2 } from './features/cases_v2';

export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;

interface PluginSetup {
  alerting: PluginSetupContract;
  features: FeaturesPluginSetup;
  guidedOnboarding?: GuidedOnboardingPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  share: SharePluginSetup;
  spaces?: SpacesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  cloud?: CloudSetup;
}

interface PluginStart {
  alerting: PluginStartContract;
  spaces?: SpacesPluginStart;
  dataViews: DataViewsServerPluginStart;
}

const o11yRuleTypes = [
  SLO_BURN_RATE_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  ...Object.values(ApmRuleType),
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
];

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  private logger: Logger;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup<PluginStart>, plugins: PluginSetup) {
    const casesCapabilities = createCasesUICapabilities();
    const casesApiTags = getCasesApiTags(observabilityFeatureId);

    const config = this.initContext.config.get<ObservabilityConfig>();

    const alertsLocator = plugins.share.url.locators.create(new AlertsLocatorDefinition());

    const logsExplorerLocator =
      plugins.share.url.locators.get<LogsExplorerLocatorParams>(LOGS_EXPLORER_LOCATOR_ID);

    const alertDetailsContextualInsightsService = new AlertDetailsContextualInsightsService();

    plugins.features.registerKibanaFeature(getCasesFeature(casesCapabilities, casesApiTags));
    plugins.features.registerKibanaFeature(getCasesFeatureV2(casesCapabilities, casesApiTags));

    let annotationsApiPromise: Promise<AnnotationsAPI> | undefined;

    core.uiSettings.register(uiSettings);

    if (config.annotations.enabled) {
      annotationsApiPromise = bootstrapAnnotations({
        core,
        index: config.annotations.index,
        context: this.initContext,
      }).catch((err) => {
        const logger = this.initContext.logger.get('annotations');
        logger.warn(err);
        throw err;
      });
    }

    if (config.createO11yGenericFeatureId) {
      plugins.features.registerKibanaFeature({
        id: observabilityFeatureId,
        name: i18n.translate('xpack.observability.nameFeatureTitle', {
          defaultMessage: 'Observability',
        }),
        order: 1000,
        category: DEFAULT_APP_CATEGORIES.observability,
        scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
        app: [observabilityFeatureId],
        catalogue: [observabilityFeatureId],
        alerting: o11yRuleTypes,
        privileges: {
          all: {
            app: [observabilityFeatureId],
            catalogue: [observabilityFeatureId],
            api: ['rac', 'observability'],
            savedObject: {
              all: [],
              read: [],
            },
            alerting: {
              rule: {
                all: o11yRuleTypes,
              },
              alert: {
                all: o11yRuleTypes,
              },
            },
            ui: ['read', 'write'],
          },
          read: {
            app: [observabilityFeatureId],
            catalogue: [observabilityFeatureId],
            api: ['rac', 'observability'],
            savedObject: {
              all: [],
              read: [],
            },
            alerting: {
              rule: {
                read: o11yRuleTypes,
              },
              alert: {
                read: o11yRuleTypes,
              },
            },
            ui: ['read'],
          },
        },
      });
    }

    const { ruleDataService } = plugins.ruleRegistry;

    core.savedObjects.registerType(threshold);

    registerRuleTypes(plugins.alerting, core.http.basePath, config, this.logger, {
      alertsLocator,
      logsExplorerLocator,
    });

    void core.getStartServices().then(([coreStart, pluginStart]) => {
      registerRoutes({
        core,
        dependencies: {
          pluginsSetup: {
            ...plugins,
            core,
          },
          dataViews: pluginStart.dataViews,
          spaces: pluginStart.spaces,
          ruleDataService,
          assistant: {
            alertDetailsContextualInsightsService,
          },
          getRulesClientWithRequest: pluginStart.alerting.getRulesClientWithRequest,
        },
        logger: this.logger,
        repository: getObservabilityServerRouteRepository(config),
      });
    });
    /**
     * Register a config for the observability guide
     */
    plugins.guidedOnboarding?.registerGuideConfig(kubernetesGuideId, kubernetesGuideConfig);

    return {
      getAlertDetailsConfig() {
        return config.unsafe.alertDetails;
      },
      getScopedAnnotationsClient: async (...args: Parameters<ScopedAnnotationsClientFactory>) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient(...args);
      },
      alertDetailsContextualInsightsService,
      alertsLocator,
    };
  }

  public start(core: CoreStart, plugins: PluginStart) {}

  public stop() {}
}
