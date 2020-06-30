/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin as PluginClass,
  PluginInitializerContext,
} from 'kibana/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { createMetricThresholdAlertType } from './alerting/metric_threshold';
import { createInventoryMetricAlertType } from './alerting/inventory';
import { getAlertType as getLogsAlertType } from './components/alerting/logs/log_threshold_alert_type';
import { registerStartSingleton } from './legacy_singletons';
import { registerFeatures } from './register_feature';
import { ClientPluginsSetup, ClientPluginsStart } from './types';

export type ClientSetup = void;
export type ClientStart = void;

export class Plugin
  implements PluginClass<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart> {
  constructor(_context: PluginInitializerContext) {}

  setup(core: CoreSetup<ClientPluginsStart, ClientStart>, pluginsSetup: ClientPluginsSetup) {
    registerFeatures(pluginsSetup.home);

    pluginsSetup.triggers_actions_ui.alertTypeRegistry.register(createInventoryMetricAlertType());
    pluginsSetup.triggers_actions_ui.alertTypeRegistry.register(getLogsAlertType());
    pluginsSetup.triggers_actions_ui.alertTypeRegistry.register(createMetricThresholdAlertType());

    core.application.register({
      id: 'logs',
      title: i18n.translate('xpack.infra.logs.pluginTitle', {
        defaultMessage: 'Logs',
      }),
      euiIconType: 'logsApp',
      order: 8100,
      appRoute: '/app/logs',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./apps/logs_app');

        return renderApp(
          coreStart,
          {
            data: pluginsStart.data,
            dataEnhanced: pluginsSetup.dataEnhanced,
            home: pluginsSetup.home,
            triggers_actions_ui: pluginsStart.triggers_actions_ui,
            usageCollection: pluginsSetup.usageCollection,
          },
          params
        );
      },
    });

    core.application.register({
      id: 'metrics',
      title: i18n.translate('xpack.infra.metrics.pluginTitle', {
        defaultMessage: 'Metrics',
      }),
      euiIconType: 'metricsApp',
      order: 8200,
      appRoute: '/app/metrics',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./apps/metrics_app');

        return renderApp(
          coreStart,
          {
            data: pluginsStart.data,
            dataEnhanced: pluginsSetup.dataEnhanced,
            home: pluginsSetup.home,
            triggers_actions_ui: pluginsStart.triggers_actions_ui,
            usageCollection: pluginsSetup.usageCollection,
          },
          params
        );
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
        const { renderApp } = await import('./apps/legacy_app');

        return renderApp(params);
      },
    });
  }

  start(core: CoreStart, _plugins: ClientPluginsStart) {
    registerStartSingleton(core);
  }
}
