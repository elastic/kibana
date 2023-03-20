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
import { PluginSetupContract } from '@kbn/alerting-plugin/server';
import { Dataset, RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { PluginSetupContract as FeaturesSetup } from '@kbn/features-plugin/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { ECS_COMPONENT_TEMPLATE_NAME } from '@kbn/alerting-plugin/server';
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';

import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
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
import { casesFeatureId, observabilityFeatureId, sloFeatureId } from '../common';
import { slo, SO_SLO_TYPE } from './saved_objects';
import { SLO_RULE_REGISTRATION_CONTEXT } from './common/constants';
import { registerRuleTypes } from './lib/rules/register_rule_types';
import { SLO_BURN_RATE_RULE_ID } from '../common/constants';
import { registerSloUsageCollector } from './lib/collectors/register';

export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;

interface PluginSetup {
  alerting: PluginSetupContract;
  features: FeaturesSetup;
  guidedOnboarding: GuidedOnboardingPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  spaces?: SpacesPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  private logger: Logger;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: PluginSetup) {
    const casesCapabilities = createCasesUICapabilities();
    const casesApiTags = getCasesApiTags(observabilityFeatureId);

    const config = this.initContext.config.get<ObservabilityConfig>();

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
                    all: [],
                    read: [],
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

    plugins.features.registerKibanaFeature({
      id: sloFeatureId,
      name: i18n.translate('xpack.observability.featureRegistry.linkSloTitle', {
        defaultMessage: 'SLOs',
      }),
      order: 1200,
      category: DEFAULT_APP_CATEGORIES.observability,
      app: [sloFeatureId, 'kibana'],
      catalogue: [sloFeatureId, 'observability'],
      alerting: [SLO_BURN_RATE_RULE_ID],
      privileges: {
        all: {
          app: [sloFeatureId, 'kibana'],
          catalogue: [sloFeatureId, 'observability'],
          api: ['slo_write', 'slo_read', 'rac'],
          savedObject: {
            all: [SO_SLO_TYPE],
            read: [],
          },
          alerting: {
            rule: {
              all: [SLO_BURN_RATE_RULE_ID],
            },
            alert: {
              all: [SLO_BURN_RATE_RULE_ID],
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
            read: [SO_SLO_TYPE],
          },
          alerting: {
            rule: {
              read: [SLO_BURN_RATE_RULE_ID],
            },
            alert: {
              read: [SLO_BURN_RATE_RULE_ID],
            },
          },
          ui: ['read'],
        },
      },
    });

    core.savedObjects.registerType(slo);

    const ruleDataClient = ruleDataService.initializeIndex({
      feature: sloFeatureId,
      registrationContext: SLO_RULE_REGISTRATION_CONTEXT,
      dataset: Dataset.alerts,
      componentTemplateRefs: [ECS_COMPONENT_TEMPLATE_NAME],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(legacyExperimentalFieldMap, 'strict'),
        },
      ],
    });
    registerRuleTypes(plugins.alerting, this.logger, ruleDataClient);
    registerSloUsageCollector(plugins.usageCollection);

    registerRoutes({
      core,
      dependencies: {
        ruleDataService,
      },
      logger: this.logger,
      repository: getObservabilityServerRouteRepository(),
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
    };
  }

  public start() {}

  public stop() {}
}
