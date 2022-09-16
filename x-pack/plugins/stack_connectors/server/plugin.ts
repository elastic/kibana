/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup, Logger } from '@kbn/core/server';
import { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import { registerConnectorTypes } from './connector_types';
import { getWellKnownEmailServiceRoute } from './routes';
export interface ConnectorsPluginsSetup {
  actions: ActionsPluginSetupContract;
}

export interface ConnectorsPluginsStart {
  actions: ActionsPluginSetupContract;
}

export class StackConnectorsPlugin implements Plugin<void, void> {
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  public setup(core: CoreSetup<ConnectorsPluginsStart>, plugins: ConnectorsPluginsSetup) {
    const router = core.http.createRouter();
    const { actions } = plugins;

    getWellKnownEmailServiceRoute(router);

    registerConnectorTypes({
      logger: this.logger,
      actions,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
    });
  }

  public start() {}
  public stop() {}
}
