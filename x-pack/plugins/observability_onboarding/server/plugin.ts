/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { mapValues } from 'lodash';
import { getObservabilityOnboardingServerRouteRepository } from './routes';
import { registerRoutes } from './routes/register_routes';
import { ObservabilityOnboardingRouteHandlerResources } from './routes/types';
import {
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginSetupDependencies,
  ObservabilityOnboardingPluginStart,
  ObservabilityOnboardingPluginStartDependencies,
} from './types';
import { ObservabilityOnboardingConfig } from '.';

export class ObservabilityOnboardingPlugin
  implements
    Plugin<
      ObservabilityOnboardingPluginSetup,
      ObservabilityOnboardingPluginStart,
      ObservabilityOnboardingPluginSetupDependencies,
      ObservabilityOnboardingPluginStartDependencies
    >
{
  private readonly logger: Logger;
  constructor(
    private readonly initContext: PluginInitializerContext<ObservabilityOnboardingConfig>
  ) {
    this.initContext = initContext;
    this.logger = this.initContext.logger.get();
  }

  public setup(
    core: CoreSetup<ObservabilityOnboardingPluginStartDependencies>,
    plugins: ObservabilityOnboardingPluginSetupDependencies
  ) {
    this.logger.debug('observability_onboarding: Setup');

    const resourcePlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof ObservabilityOnboardingPluginStartDependencies
            ];
          }),
      };
    }) as ObservabilityOnboardingRouteHandlerResources['plugins'];

    registerRoutes({
      core,
      logger: this.logger,
      repository: getObservabilityOnboardingServerRouteRepository(),
      plugins: resourcePlugins,
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('observability_onboarding: Started');

    return {};
  }

  public stop() {}
}
