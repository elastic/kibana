/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup } from '@kbn/core/server';
import { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '@kbn/alerting-plugin/server';
import { registerConnectorTypes, registerConnectorAdapters } from './connector_types';
import { getWellKnownEmailServiceRoute } from './routes';
export interface ConnectorsPluginsSetup {
  actions: ActionsPluginSetupContract;
  alerting: AlertingPluginSetupContract;
}

export interface ConnectorsPluginsStart {
  actions: ActionsPluginSetupContract;
}

export class StackConnectorsPlugin implements Plugin<void, void> {
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup<ConnectorsPluginsStart>, plugins: ConnectorsPluginsSetup) {
    const router = core.http.createRouter();
    const { actions } = plugins;

    getWellKnownEmailServiceRoute(router);

    registerConnectorTypes({
      actions,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
    });

    registerConnectorAdapters({ alerting: plugins.alerting });
  }

  public start() {}
  public stop() {}
}
