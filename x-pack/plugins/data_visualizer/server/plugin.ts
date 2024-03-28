/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { StartDeps, SetupDeps } from './types';
import { registerWithCustomIntegrations } from './register_custom_integration';
import { routes } from './routes';

export class DataVisualizerPlugin implements Plugin {
  private readonly _logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this._logger = initializerContext.logger.get();
  }

  setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    // home-plugin required
    if (plugins.home && plugins.customIntegrations) {
      registerWithCustomIntegrations(plugins.customIntegrations);
    }
    routes(coreSetup, this._logger);
  }

  start(core: CoreStart) {}
}
