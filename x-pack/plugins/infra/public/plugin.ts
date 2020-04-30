/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { merge } from 'lodash';
import {
  Plugin as PluginClass,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  AppMountParameters,
} from 'kibana/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';
import { registerStartSingleton } from './legacy_singletons';
import { registerFeatures } from './register_feature';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { DataEnhancedSetup, DataEnhancedStart } from '../../data_enhanced/public';

import { TriggersAndActionsUIPublicPluginSetup } from '../../../plugins/triggers_actions_ui/public';
import { getAlertType as getLogsAlertType } from './components/alerting/logs/log_threshold_alert_type';
import { getInventoryMetricAlertType } from './components/alerting/inventory/metric_inventory_threshold_alert_type';
import { createMetricThresholdAlertType } from './alerting/metric_threshold';

export type ClientSetup = void;
export type ClientStart = void;

export interface ClientPluginsSetup {
  home: HomePublicPluginSetup;
  data: DataPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
  dataEnhanced: DataEnhancedSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
}

export interface ClientPluginsStart {
  data: DataPublicPluginStart;
  dataEnhanced: DataEnhancedStart;
}

export type InfraPlugins = ClientPluginsSetup & ClientPluginsStart;

const getMergedPlugins = (setup: ClientPluginsSetup, start: ClientPluginsStart): InfraPlugins => {
  return merge({}, setup, start);
};

export class Plugin
  implements PluginClass<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart> {
  constructor(context: PluginInitializerContext) {}

  setup(core: CoreSetup, pluginsSetup: ClientPluginsSetup) {
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
      order: 8001,
      appRoute: '/app/logs',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const plugins = getMergedPlugins(pluginsSetup, pluginsStart as ClientPluginsStart);
        const { startApp, composeLibs, LogsRouter } = await this.downloadAssets();

        return startApp(
          composeLibs(coreStart),
          coreStart,
          plugins,
          params,
          LogsRouter,
          pluginsSetup.triggers_actions_ui
        );
      },
    });

    core.application.register({
      id: 'metrics',
      title: i18n.translate('xpack.infra.metrics.pluginTitle', {
        defaultMessage: 'Metrics',
      }),
      euiIconType: 'metricsApp',
      order: 8000,
      appRoute: '/app/metrics',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const plugins = getMergedPlugins(pluginsSetup, pluginsStart as ClientPluginsStart);
        const { startApp, composeLibs, MetricsRouter } = await this.downloadAssets();

        return startApp(
          composeLibs(coreStart),
          coreStart,
          plugins,
          params,
          MetricsRouter,
          pluginsSetup.triggers_actions_ui
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
        const { startLegacyApp } = await import('./apps/start_legacy_app');
        return startLegacyApp(params);
      },
    });
  }

  start(core: CoreStart, plugins: ClientPluginsStart) {
    registerStartSingleton(core);
  }

  private async downloadAssets() {
    const [{ startApp }, { composeLibs }, { LogsRouter, MetricsRouter }] = await Promise.all([
      import('./apps/start_app'),
      import('./compose_libs'),
      import('./routers'),
    ]);

    return {
      startApp,
      composeLibs,
      LogsRouter,
      MetricsRouter,
    };
  }
}
