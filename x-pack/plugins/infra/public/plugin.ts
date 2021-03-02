/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AppMountParameters, PluginInitializerContext } from 'kibana/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { createMetricThresholdAlertType } from './alerting/metric_threshold';
import { createInventoryMetricAlertType } from './alerting/inventory';
import { createMetricAnomalyAlertType } from './alerting/metric_anomaly';
import { getAlertType as getLogsAlertType } from './alerting/log_threshold';
import { registerFeatures } from './register_feature';
import {
  InfraClientSetupDeps,
  InfraClientStartDeps,
  InfraClientCoreSetup,
  InfraClientCoreStart,
  InfraClientPluginClass,
} from './types';
import { getLogsHasDataFetcher, getLogsOverviewDataFetcher } from './utils/logs_overview_fetchers';
import { createMetricsHasData, createMetricsFetchData } from './metrics_overview_fetchers';
import { LOG_STREAM_EMBEDDABLE } from './components/log_stream/log_stream_embeddable';
import { LogStreamEmbeddableFactoryDefinition } from './components/log_stream/log_stream_embeddable_factory';

export class Plugin implements InfraClientPluginClass {
  constructor(_context: PluginInitializerContext) {}

  setup(core: InfraClientCoreSetup, pluginsSetup: InfraClientSetupDeps) {
    if (pluginsSetup.home) {
      registerFeatures(pluginsSetup.home);
    }

    pluginsSetup.triggersActionsUi.alertTypeRegistry.register(createInventoryMetricAlertType());
    pluginsSetup.triggersActionsUi.alertTypeRegistry.register(getLogsAlertType());
    pluginsSetup.triggersActionsUi.alertTypeRegistry.register(createMetricThresholdAlertType());
    pluginsSetup.triggersActionsUi.alertTypeRegistry.register(createMetricAnomalyAlertType());

    if (pluginsSetup.observability) {
      pluginsSetup.observability.dashboard.register({
        appName: 'infra_logs',
        hasData: getLogsHasDataFetcher(core.getStartServices),
        fetchData: getLogsOverviewDataFetcher(core.getStartServices),
      });

      pluginsSetup.observability.dashboard.register({
        appName: 'infra_metrics',
        hasData: createMetricsHasData(core.getStartServices),
        fetchData: createMetricsFetchData(core.getStartServices),
      });
    }

    pluginsSetup.embeddable.registerEmbeddableFactory(
      LOG_STREAM_EMBEDDABLE,
      new LogStreamEmbeddableFactoryDefinition(core.getStartServices)
    );

    core.application.register({
      id: 'logs',
      title: i18n.translate('xpack.infra.logs.pluginTitle', {
        defaultMessage: 'Logs',
      }),
      euiIconType: 'logoObservability',
      order: 8100,
      appRoute: '/app/logs',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        // mount callback should not use setup dependencies, get start dependencies instead
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
      euiIconType: 'logoObservability',
      order: 8200,
      appRoute: '/app/metrics',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        // mount callback should not use setup dependencies, get start dependencies instead
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
        const { renderApp } = await import('./apps/legacy_app');

        return renderApp(params);
      },
    });
  }

  start(_core: InfraClientCoreStart, _plugins: InfraClientStartDeps) {}

  stop() {}
}
