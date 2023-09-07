/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { createLogExplorer } from './components/log_explorer';
import { DatasetsService, IDatasetsClient } from './services/datasets';
import {
  LogExplorerPluginSetup,
  LogExplorerPluginStart,
  LogExplorerSetupDeps,
  LogExplorerStartDeps,
} from './types';

export class LogExplorerPlugin implements Plugin<LogExplorerPluginSetup, LogExplorerPluginStart> {
  private datasetsService: DatasetsService;
  private datasetsClient?: IDatasetsClient;

  constructor(context: PluginInitializerContext) {
    this.datasetsService = new DatasetsService();
  }

  public setup(core: CoreSetup, plugins: LogExplorerSetupDeps) {
    this.datasetsClient = this.datasetsService.setup({
      http: core.http,
    }).client;

    return {
      datasetsService: this.datasetsClient,
    };
  }

  public start(core: CoreStart, plugins: LogExplorerStartDeps) {
    const { data, discover } = plugins;

    const LogExplorer = createLogExplorer({
      core,
      data,
      discover,
      datasetsClient: this.datasetsClient!,
    });

    return {
      LogExplorer,
    };
  }
}
