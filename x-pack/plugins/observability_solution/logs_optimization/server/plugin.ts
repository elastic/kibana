/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';

import {
  LogsOptimizationPluginCoreSetup,
  LogsOptimizationServerSetup,
  LogsOptimizationServerStart,
  LogsOptimizationServerPluginSetupDeps,
  LogsOptimizationServerPluginStartDeps,
} from './types';

import { LogsOptimizationBackendLibs } from './lib/shared_types';
import { initLogsOptimizationServer } from './logs_optimization_server';

export class LogsOptimizationPlugin
  implements
    Plugin<
      LogsOptimizationServerSetup,
      LogsOptimizationServerStart,
      LogsOptimizationServerPluginSetupDeps,
      LogsOptimizationServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  private libs!: LogsOptimizationBackendLibs;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  public setup(
    core: LogsOptimizationPluginCoreSetup,
    plugins: LogsOptimizationServerPluginSetupDeps
  ) {
    this.libs = {
      getStartServices: () => core.getStartServices(),
      logger: this.logger,
      plugins,
      router: core.http.createRouter(),
    };

    // Register server side APIs
    initLogsOptimizationServer(this.libs);

    return {};
  }

  public start(_core: CoreStart, _plugins: LogsOptimizationServerPluginStartDeps) {
    return {};
  }
}
