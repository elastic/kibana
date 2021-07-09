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
} from '../../../../src/core/server';
import { ObservabilityConfig } from '.';
import {
  bootstrapAnnotations,
  ScopedAnnotationsClientFactory,
  AnnotationsAPI,
} from './lib/annotations/bootstrap_annotations';
import type { RuleRegistryPluginSetupContract } from '../../rule_registry/server';
import { PluginSetupContract as FeaturesSetup } from '../../features/server';
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
          app: [casesFeatureId, 'kibana'],
          catalogue: [observabilityFeatureId],
          cases: {
            all: [observabilityFeatureId],
          },
          api: [],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['crud_cases', 'read_cases'], // uiCapabilities[casesFeatureId].crud_cases or read_cases
        },
        read: {
          app: [casesFeatureId, 'kibana'],
          catalogue: [observabilityFeatureId],
          cases: {
            read: [observabilityFeatureId],
          },
          api: [],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['read_cases'], // uiCapabilities[uiCapabilities[casesFeatureId]].read_cases
        },
      },
    });

    const config = this.initContext.config.get<ObservabilityConfig>();

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

    const ruleDataClient = plugins.ruleRegistry.ruleDataService.getRuleDataClient(
      'observability',
      plugins.ruleRegistry.ruleDataService.getFullAssetName(),
      () => Promise.resolve()
    );

    registerRoutes({
      core: {
        setup: core,
        start,
      },
      logger: this.initContext.logger.get(),
      repository: getGlobalObservabilityServerRouteRepository(),
      ruleDataClient,
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
