/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  Logger,
} from '@kbn/core/server';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import { PluginSetupContract, PluginStartContract } from '@kbn/alerting-plugin/server';
import { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { PluginSetupContract as FeaturesSetup } from '@kbn/features-plugin/server';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import {
  kubernetesGuideId,
  kubernetesGuideConfig,
} from '../common/guided_onboarding/kubernetes_guide_config';
import { ObservabilityConfig } from '.';
import {
  bootstrapAnnotations,
  ScopedAnnotationsClientFactory,
  AnnotationsAPI,
} from './lib/annotations/bootstrap_annotations';
import { uiSettings } from './ui_settings';
import { registerRoutes } from './routes/register_routes';
import { getObservabilityServerRouteRepository } from './routes/get_global_observability_server_route_repository';
import { compositeSlo, slo, SO_COMPOSITE_SLO_TYPE, SO_SLO_TYPE } from './saved_objects';
import { AlertsLocatorDefinition } from '../common/locators/alerts';
import { casesFeatureId, observabilityFeatureId, sloFeatureId } from '../common';
import { registerRuleTypes } from './lib/rules/register_rule_types';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../common/constants';
import { registerSloUsageCollector } from './lib/collectors/register';
import { OpenAIService } from './services/openai';
import { threshold } from './saved_objects/threshold';

export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;

interface PluginSetup {
  alerting: PluginSetupContract;
  features: FeaturesSetup;
  guidedOnboarding: GuidedOnboardingPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  share: SharePluginSetup;
  spaces?: SpacesPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

interface PluginStart {
  alerting: PluginStartContract;
}

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

    plugins.features.registerKibanaFeature({
      id: casesFeatureId,
      name: i18n.translate('xpack.observability.featureRegistry.linkObservabilityTitle', {
        defaultMessage: 'Cases',
      }),
      order: 1100,
      category: DEFAULT_APP_CATEGORIES.observability,
      app: [casesFeatureId, 'kibana'],
      catalogue: [observabilityFeatureId],
      cases: [observabilityFeatureId],
      privileges: {
        all: {
          api: casesApiTags.all,
          app: [casesFeatureId, 'kibana'],
          catalogue: [observabilityFeatureId],
          cases: {
            create: [observabilityFeatureId],
            read: [observabilityFeatureId],
            update: [observabilityFeatureId],
            push: [observabilityFeatureId],
          },
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          ui: casesCapabilities.all,
        },
        read: {
          api: casesApiTags.read,
          app: [casesFeatureId, 'kibana'],
          catalogue: [observabilityFeatureId],
          cases: {
            read: [observabilityFeatureId],
          },
          savedObject: {
            all: [],
            read: [...filesSavedObjectTypes],
          },
          ui: casesCapabilities.read,
        },
      },
      subFeatures: [
        {
          name: i18n.translate('xpack.observability.featureRegistry.deleteSubFeatureName', {
            defaultMessage: 'Delete',
          }),
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  api: casesApiTags.delete,
                  id: 'cases_delete',
                  name: i18n.translate(
                    'xpack.observability.featureRegistry.deleteSubFeatureDetails',
                    {
                      defaultMessage: 'Delete cases and comments',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    all: [...filesSavedObjectTypes],
                    read: [...filesSavedObjectTypes],
                  },
                  cases: {
                    delete: [observabilityFeatureId],
                  },
                  ui: casesCapabilities.delete,
                },
              ],
            },
          ],
        },
      ],
    });

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

    const { ruleDataService } = plugins.ruleRegistry;

    const savedObjectTypes = config.compositeSlo.enabled
      ? [SO_SLO_TYPE, SO_COMPOSITE_SLO_TYPE]
      : [SO_SLO_TYPE];
    plugins.features.registerKibanaFeature({
      id: sloFeatureId,
      name: i18n.translate('xpack.observability.featureRegistry.linkSloTitle', {
        defaultMessage: 'SLOs',
      }),
      order: 1200,
      category: DEFAULT_APP_CATEGORIES.observability,
      app: [sloFeatureId, 'kibana'],
      catalogue: [sloFeatureId, 'observability'],
      alerting: [SLO_BURN_RATE_RULE_TYPE_ID],
      privileges: {
        all: {
          app: [sloFeatureId, 'kibana'],
          catalogue: [sloFeatureId, 'observability'],
          api: ['slo_write', 'slo_read', 'rac'],
          savedObject: {
            all: savedObjectTypes,
            read: [],
          },
          alerting: {
            rule: {
              all: [SLO_BURN_RATE_RULE_TYPE_ID],
            },
            alert: {
              all: [SLO_BURN_RATE_RULE_TYPE_ID],
            },
          },
          ui: ['read', 'write'],
        },
        read: {
          app: [sloFeatureId, 'kibana'],
          catalogue: [sloFeatureId, 'observability'],
          api: ['slo_read', 'rac'],
          savedObject: {
            all: [],
            read: savedObjectTypes,
          },
          alerting: {
            rule: {
              read: [SLO_BURN_RATE_RULE_TYPE_ID],
            },
            alert: {
              read: [SLO_BURN_RATE_RULE_TYPE_ID],
            },
          },
          ui: ['read'],
        },
      },
    });

    core.savedObjects.registerType(slo);
    if (config.compositeSlo.enabled) {
      core.savedObjects.registerType(compositeSlo);
    }
    core.savedObjects.registerType(threshold);

    registerRuleTypes(
      plugins.alerting,
      this.logger,
      ruleDataService,
      core.http.basePath,
      config,
      alertsLocator
    );
    registerSloUsageCollector(plugins.usageCollection);

    const openAIService = config.aiAssistant?.enabled
      ? new OpenAIService(config.aiAssistant)
      : undefined;

    core.getStartServices().then(([coreStart, pluginStart]) => {
      registerRoutes({
        core,
        dependencies: {
          ruleDataService,
          getRulesClientWithRequest: pluginStart.alerting.getRulesClientWithRequest,
          getOpenAIClient: () => openAIService?.client,
        },
        logger: this.logger,
        repository: getObservabilityServerRouteRepository(config),
      });
    });

    /**
     * Register a config for the observability guide
     */
    plugins.guidedOnboarding.registerGuideConfig(kubernetesGuideId, kubernetesGuideConfig);

    return {
      getAlertDetailsConfig() {
        return config.unsafe.alertDetails;
      },
      getScopedAnnotationsClient: async (...args: Parameters<ScopedAnnotationsClientFactory>) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient(...args);
      },
      getOpenAIClient() {
        return openAIService?.client;
      },
      alertsLocator,
    };
  }

  public start() {}

  public stop() {}
}
