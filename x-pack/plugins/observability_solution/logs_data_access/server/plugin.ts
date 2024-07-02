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
import { registerServices } from './services/register_services';
import { LogsDataAccessPluginStartDeps, LogsDataAccessPluginSetupDeps } from './types';

export type LogsDataAccessPluginSetup = ReturnType<LogsDataAccessPlugin['setup']>;
export type LogsDataAccessPluginStart = ReturnType<LogsDataAccessPlugin['start']>;

export class LogsDataAccessPlugin
  implements
    Plugin<
      LogsDataAccessPluginSetup,
      LogsDataAccessPluginStart,
      LogsDataAccessPluginSetupDeps,
      LogsDataAccessPluginStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }
  public setup(core: CoreSetup, plugins: LogsDataAccessPluginSetupDeps) {}

  public start(core: CoreStart, plugins: LogsDataAccessPluginStartDeps) {
    const services = registerServices();

    return {
      services,
    };
  }
}
