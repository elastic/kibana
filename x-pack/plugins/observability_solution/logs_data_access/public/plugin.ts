/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { Plugin } from '@kbn/core/public';
import { registerServices } from './services/register_services';
import { LogsDataAccessPluginSetupDeps, LogsDataAccessPluginStartDeps } from './types';
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
  public setup() {}

  public start(core: CoreStart, plugins: LogsDataAccessPluginStartDeps) {
    const services = registerServices({
      deps: {
        uiSettings: core.uiSettings,
      },
    });

    return {
      services,
    };
  }

  public stop() {}
}
