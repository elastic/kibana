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
import { ObservabilityService, Setup } from './service';

export interface ObservabilityPluginSetup {
  chartDataFetcher: Setup;
}

export type ObservabilityPluginStart = void;

export class Plugin implements PluginClass<ObservabilityPluginSetup, ObservabilityPluginStart> {
  private readonly observabilityService: ObservabilityService;
  constructor(context: PluginInitializerContext) {
    this.observabilityService = new ObservabilityService();
  }

  public setup(core: CoreSetup) {
    core.application.register({
      id: 'observability-overview',
      title: 'Overview',
      order: 8000,
      appRoute: '/app/observability',
      category: DEFAULT_APP_CATEGORIES.observability,

      mount: async (params: AppMountParameters<unknown>) => {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services
        const [coreStart] = await core.getStartServices();

        return renderApp(coreStart, params, this.observabilityService.getHandlers());
      },
    });

    return {
      chartDataFetcher: this.observabilityService.setup(core),
    };
  }
  public start() {}
}
