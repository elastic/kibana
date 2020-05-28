/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  Plugin as PluginClass,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  AppMountParameters,
} from 'kibana/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { registerStartSingleton } from './legacy_singletons';
import { registerFeatures } from './register_feature';
import { getAlertType as getLogsAlertType } from './components/alerting/logs/log_threshold_alert_type';
import { getInventoryMetricAlertType } from './components/alerting/inventory/metric_inventory_threshold_alert_type';
import { createMetricThresholdAlertType } from './alerting/metric_threshold';
import { ClientPluginsSetup, ClientPluginsStart } from './types';

export type ClientSetup = void;
export type ClientStart = void;

export class Plugin
  implements PluginClass<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart> {
  constructor(private context: PluginInitializerContext) {}

  setup(core: CoreSetup<ClientPluginsStart, ClientStart>, pluginsSetup: ClientPluginsSetup) {
    registerFeatures(pluginsSetup.home);

    pluginsSetup.triggers_actions_ui.alertTypeRegistry.register(getInventoryMetricAlertType());
    pluginsSetup.triggers_actions_ui.alertTypeRegistry.register(getLogsAlertType());
    pluginsSetup.triggers_actions_ui.alertTypeRegistry.register(createMetricThresholdAlertType());

    core.application.register({
      id: 'logs',
      title: i18n.translate('xpack.infra.logs.pluginTitle', {
        defaultMessage: 'Logs',
      }),
      euiIconType: 'logsApp',
      order: 8000,
      appRoute: '/app/logs',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./apps/logs_app');

        return renderApp(coreStart, pluginsStart, params);
      },
    });

    core.application.register({
      id: 'metrics',
      title: i18n.translate('xpack.infra.metrics.pluginTitle', {
        defaultMessage: 'Metrics',
      }),
      euiIconType: 'metricsApp',
      order: 8001,
      appRoute: '/app/metrics',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./apps/metrics_app');

        return renderApp(coreStart, pluginsStart, params);
      },
    });

    /* This exists purely to facilitate URL redirects from the old App ID ("infra"),
    to our new App IDs ("metrics" and "logs"). With version 8.0.0 we can remove this. */
    core.application.register({
      id: 'infra',
      appRoute: '/app/infra',
      title: 'infra',
      navLinkStatus: 3,
      mount: async (params: AppMountParameters) => {
        const { startLegacyApp } = await import('./apps/start_legacy_app');
        return startLegacyApp(params);
      },
    });
  }

  start(core: CoreStart, _plugins: ClientPluginsStart) {
    registerStartSingleton(core);
  }

  // private async downloadAssets() {
  //   const [{ startApp }, { composeLibs }, { LogsRouter, MetricsRouter }] = await Promise.all([
  //     import('./apps/start_app'),
  //     import('./compose_libs'),
  //     import('./routers'),
  //   ]);

  //   return {
  //     startApp,
  //     composeLibs,
  //     LogsRouter,
  //     MetricsRouter,
  //   };
  // }
}
