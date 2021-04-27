/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { ObservabilityConfig } from '.';
import {
  bootstrapAnnotations,
  ScopedAnnotationsClientFactory,
  AnnotationsAPI,
} from './lib/annotations/bootstrap_annotations';
import type { RuleRegistryPluginSetupContract } from '../../rule_registry/server';
import { uiSettings } from './ui_settings';
import { registerRoutes } from './routes/register_routes';
import { getGlobalObservabilityServerRouteRepository } from './routes/get_global_observability_server_route_repository';
import { observabilityRuleRegistrySettings } from '../common/rules/observability_rule_registry_settings';
import { observabilityRuleFieldMap } from '../common/rules/observability_rule_field_map';

export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;
export type ObservabilityRuleRegistry = ObservabilityPluginSetup['ruleRegistry'];

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(
    core: CoreSetup,
    plugins: {
      ruleRegistry: RuleRegistryPluginSetupContract;
    }
  ) {
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

    const observabilityRuleRegistry = plugins.ruleRegistry.create({
      ...observabilityRuleRegistrySettings,
      fieldMap: observabilityRuleFieldMap,
    });

    registerRoutes({
      core: {
        setup: core,
        start: () => core.getStartServices().then(([coreStart]) => coreStart),
      },
      ruleRegistry: observabilityRuleRegistry,
      logger: this.initContext.logger.get(),
      repository: getGlobalObservabilityServerRouteRepository(),
    });

    return {
      getScopedAnnotationsClient: async (...args: Parameters<ScopedAnnotationsClientFactory>) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient(...args);
      },
      ruleRegistry: observabilityRuleRegistry,
    };
  }

  public start() {}

  public stop() {}
}
