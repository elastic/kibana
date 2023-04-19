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
  ObservabilityOnboardingPluginSetupDependencies,
  ObservabilityOnboardingPluginStartDependencies,
} from './types';

export type ObservabilityOnboardingPluginSetup = ReturnType<
  ObservabilityOnboardingPlugin['setup']
>;

export class ObservabilityOnboardingPlugin
  implements Plugin<ObservabilityOnboardingPluginSetup>
{
  private logger?: Logger;
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(
    core: CoreSetup<ObservabilityOnboardingPluginStartDependencies>,
    plugins: ObservabilityOnboardingPluginSetupDependencies
  ) {
    this.logger = this.initContext.logger.get();

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

  public start(core: CoreStart) {}

  public stop() {}
}
