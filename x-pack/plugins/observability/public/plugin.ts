/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConfigSchema } from '.';
import {
  AppMountParameters,
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  // CoreStart,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '../../../../src/core/public';

export type ClientSetup = void;
export type ClientStart = void;

// eslint-disable-next-line
export interface PluginSetupDeps {
}

export class Plugin implements PluginClass<ClientSetup, ClientStart> {
  private readonly initializerContext: PluginInitializerContext<ConfigSchema>;
  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: PluginSetupDeps) {
    const config = this.initializerContext.config.get();
    const pluginSetupDeps = plugins;

    core.application.register({
      id: 'observability-overview',
      title: 'Overview',
      order: 7999,
      appRoute: '/app/observability',
      category: DEFAULT_APP_CATEGORIES.observability,

      async mount(params: AppMountParameters<unknown>) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services
        const [coreStart] = await core.getStartServices();

        return renderApp(coreStart, pluginSetupDeps, params, config);
      },
    });
  }
  public start() {}
}
