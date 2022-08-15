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
} from '@kbn/core/server';
import { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { PluginSetupContract as FeaturesSetup } from '@kbn/features-plugin/server';
import { createUICapabilities } from '@kbn/cases-plugin/common';
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

export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;

interface PluginSetup {
  features: FeaturesSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(core: CoreSetup, plugins: PluginSetup) {
    const config = this.initContext.config.get<ObservabilityConfig>();

    const casesCapabilities = createUICapabilities();

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
          api: ['bulkGetUserProfiles'],
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

    const start = () => core.getStartServices().then(([coreStart]) => coreStart);

    const { ruleDataService } = plugins.ruleRegistry;

    registerRoutes({
      core: {
        setup: core,
        start,
      },
      logger: this.initContext.logger.get(),
      repository: getGlobalObservabilityServerRouteRepository(),
      ruleDataService,
    });

    return {
      getScopedAnnotationsClient: async (...args: Parameters<ScopedAnnotationsClientFactory>) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient(...args);
      },
    };
  }

  public start() {}

  public stop() {}
}
