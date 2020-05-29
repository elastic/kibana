/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  AppMountParameters,
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '../../../../src/core/public';

export type ClientSetup = void;
export type ClientStart = void;

export class Plugin implements PluginClass<ClientSetup, ClientStart> {
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
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

        return renderApp(coreStart, params);
      },
    });
  }
  public start() {}
}
