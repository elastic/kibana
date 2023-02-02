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
import { PluginSetupContract } from '@kbn/alerting-plugin/server';
import { Dataset, RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { PluginSetupContract as FeaturesSetup } from '@kbn/features-plugin/server';
import { createUICapabilities } from '@kbn/cases-plugin/common';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { experimentalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/experimental_rule_field_map';
import { mappingFromFieldMap } from '@kbn/rule-registry-plugin/common/mapping_from_field_map';
import { ECS_COMPONENT_TEMPLATE_NAME } from '@kbn/rule-registry-plugin/common/assets';
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';

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
import { getGlobalObservabilityServerRouteRepository } from './routes/get_global_observability_server_route_repository';
import { casesFeatureId, observabilityFeatureId } from '../common';
import { slo } from './saved_objects';
import { OBSERVABILITY_FEATURE_ID, RULE_REGISTRATION_CONTEXT } from './common/constants';
import { registerRuleTypes } from './lib/rules/register_rule_types';

export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;

interface PluginSetup {
  features: FeaturesSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  spaces: SpacesPluginStart;
  alerting: PluginSetupContract;
  guidedOnboarding: GuidedOnboardingPluginSetup;
}

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  private logger: Logger;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: PluginSetup) {
    const casesCapabilities = createUICapabilities();
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
          api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles'],
          app: [casesFeatureId, 'kibana'],
          catalogue: [observabilityFeatureId],
          cases: {
            create: [observabilityFeatureId],
            read: [observabilityFeatureId],
            update: [observabilityFeatureId],
            push: [observabilityFeatureId],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: casesCapabilities.all,
        },
        read: {
          api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles'],
          app: [casesFeatureId, 'kibana'],
          catalogue: [observabilityFeatureId],
          cases: {
            read: [observabilityFeatureId],
          },
          savedObject: {
            all: [],
            read: [],
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
                  api: [],
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

    if (config.unsafe.slo.enabled) {
      core.savedObjects.registerType(slo);

      const ruleDataClient = ruleDataService.initializeIndex({
        feature: OBSERVABILITY_FEATURE_ID,
        registrationContext: RULE_REGISTRATION_CONTEXT,
        dataset: Dataset.alerts,
        componentTemplateRefs: [ECS_COMPONENT_TEMPLATE_NAME],
        componentTemplates: [
          {
            name: 'mappings',
            mappings: mappingFromFieldMap(experimentalRuleFieldMap, 'strict'),
          },
        ],
      });

      registerRuleTypes(plugins.alerting, this.logger, ruleDataClient);
    }

    const start = () => core.getStartServices().then(([coreStart]) => coreStart);

    registerRoutes({
      core: {
        setup: core,
        start,
      },
      logger: this.logger,
      repository: getGlobalObservabilityServerRouteRepository(config),
      ruleDataService,
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
