/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import {
  ProfilingPluginSetup,
  ProfilingPluginStart,
  ProfilingPluginSetupDeps,
  ProfilingPluginStartDeps,
} from './types';
import { mySearchStrategyProvider } from './my_strategy';
import { registerRoutes } from './routes';
import { PROFILING_FEATURE } from './feature';

export class ProfilingPlugin
  implements
    Plugin<
      ProfilingPluginSetup,
      ProfilingPluginStart,
      ProfilingPluginSetupDeps,
      ProfilingPluginStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<ProfilingPluginStartDeps>, deps: ProfilingPluginSetupDeps) {
    this.logger.debug('profiling: Setup');
    const router = core.http.createRouter<DataRequestHandlerContext>();

    deps.features.registerKibanaFeature(PROFILING_FEATURE);

    core.getStartServices().then(([_, depsStart]) => {
      const myStrategy = mySearchStrategyProvider(depsStart.data);
      deps.data.search.registerSearchStrategy('myStrategy', myStrategy);
      registerRoutes(router, this.logger);
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('profiling: Started');
    return {};
  }

  public stop() {}
}
