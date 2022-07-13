/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';

import { PROFILING_FEATURE } from './feature';
import { registerRoutes } from './routes';
import {
  ProfilingPluginSetup,
  ProfilingPluginSetupDeps,
  ProfilingPluginStart,
  ProfilingPluginStartDeps,
  ProfilingRequestHandlerContext,
} from './types';

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
    const router = core.http.createRouter<ProfilingRequestHandlerContext>();

    deps.features.registerKibanaFeature(PROFILING_FEATURE);

    core.getStartServices().then(([_, depsStart]) => {
      registerRoutes({
        router,
        logger: this.logger!,
        dependencies: {
          start: depsStart,
          setup: deps,
        },
      });
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('profiling: Started');
    return {};
  }

  public stop() {}
}
