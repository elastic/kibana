/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../common';

export type ClientAppsPluginSetup = void;
export type ClientAppsPluginStart = void;

export class ClientAppsPlugin implements Plugin<ClientAppsPluginSetup, ClientAppsPluginStart> {
  public setup(core: CoreSetup) {
    core.application.register({
      id: PLUGIN_ID,
      title: i18n.translate('xpack.clientApps.appTitle', {
        defaultMessage: 'Client Apps',
      }),
      appRoute: `/app/${PLUGIN_ID}`,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./app');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });
  }

  public start() {}
}
