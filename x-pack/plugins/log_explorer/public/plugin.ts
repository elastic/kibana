/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { LogExplorerConfig } from '../common/plugin_config';
import { createLogExplorer } from './components/log_explorer';
import {
  LogExplorerPluginSetup,
  LogExplorerPluginStart,
  LogExplorerSetupDeps,
  LogExplorerStartDeps,
} from './types';

export class LogExplorerPlugin implements Plugin<LogExplorerPluginSetup, LogExplorerPluginStart> {
  private config: LogExplorerConfig;

  constructor(context: PluginInitializerContext<LogExplorerConfig>) {
    this.config = context.config.get();
  }

  public setup(core: CoreSetup, plugins: LogExplorerSetupDeps) {}

  public start(core: CoreStart, plugins: LogExplorerStartDeps) {
    const { data, discover } = plugins;

    const LogExplorer = createLogExplorer({
      core,
      data,
      discover,
    });

    return {
      LogExplorer,
    };
  }
}
