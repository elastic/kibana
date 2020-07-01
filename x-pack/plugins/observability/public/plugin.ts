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
import { registerDataHandler } from './data_handler';
// TODO: caue: remove it later
import { fetchLogsData } from './mock/logs.mock';
import { fetchMetricsData } from './mock/metrics.mock';
import { fetchUptimeData } from './mock/uptime.mock';

export interface ObservabilityPluginSetup {
  dashboard: { register: typeof registerDataHandler };
}

export type ObservabilityPluginStart = void;

export class Plugin implements PluginClass<ObservabilityPluginSetup, ObservabilityPluginStart> {
  constructor(context: PluginInitializerContext) {}

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

        return renderApp(coreStart, params);
      },
    });

    registerDataHandler({
      appName: 'infra_logs',
      fetchData: fetchLogsData,
      hasData: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 2000);
        }),
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: fetchMetricsData,
      hasData: () => Promise.resolve(true),
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: fetchUptimeData,
      hasData: () => Promise.resolve(true),
    });

    return {
      dashboard: { register: registerDataHandler },
    };
  }
  public start() {}
}
