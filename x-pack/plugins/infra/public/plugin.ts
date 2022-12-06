/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  AppUpdater,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { enableInfrastructureHostsView } from '@kbn/observability-plugin/public';
import { BehaviorSubject, combineLatest, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { defaultLogViewsStaticConfig } from '../common/log_views';
import { InfraPublicConfig } from '../common/plugin_config_types';
import { createInventoryMetricRuleType } from './alerting/inventory';
import { createLogThresholdRuleType } from './alerting/log_threshold';
import { createMetricThresholdRuleType } from './alerting/metric_threshold';
import { createLazyContainerMetricsTable } from './components/infrastructure_node_metrics_tables/container/create_lazy_container_metrics_table';
import { createLazyHostMetricsTable } from './components/infrastructure_node_metrics_tables/host/create_lazy_host_metrics_table';
import { createLazyPodMetricsTable } from './components/infrastructure_node_metrics_tables/pod/create_lazy_pod_metrics_table';
import { LOG_STREAM_EMBEDDABLE } from './components/log_stream/log_stream_embeddable';
import { LogStreamEmbeddableFactoryDefinition } from './components/log_stream/log_stream_embeddable_factory';
import { createMetricsFetchData, createMetricsHasData } from './metrics_overview_fetchers';
import { registerFeatures } from './register_feature';
import { LogViewsService } from './services/log_views';
import {
  InfraClientCoreSetup,
  InfraClientCoreStart,
  InfraClientPluginClass,
  InfraClientSetupDeps,
  InfraClientStartDeps,
  InfraClientStartExports,
  InfraClientStartServices,
} from './types';
import { getLogsHasDataFetcher, getLogsOverviewDataFetcher } from './utils/logs_overview_fetchers';

export class Plugin implements InfraClientPluginClass {
  public config: InfraPublicConfig;
  private logViews: LogViewsService;
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(context: PluginInitializerContext<InfraPublicConfig>) {
    this.config = context.config.get();
    this.logViews = new LogViewsService({
      messageFields:
        this.config.sources?.default?.fields?.message ?? defaultLogViewsStaticConfig.messageFields,
    });
  }

  setup(core: InfraClientCoreSetup, pluginsSetup: InfraClientSetupDeps) {
    if (pluginsSetup.home) {
      registerFeatures(pluginsSetup.home);
    }

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createInventoryMetricRuleType()
    );

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createLogThresholdRuleType(core)
    );
    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createMetricThresholdRuleType()
    );
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

    const startDep$AndHostViewFlag$ = combineLatest([
      from(core.getStartServices()),
      core.uiSettings.get$<boolean>(enableInfrastructureHostsView),
    ]);

    /** !! Need to be kept in sync with the deepLinks in x-pack/plugins/infra/public/plugin.ts */
    const infraEntries = [
      { label: 'Inventory', app: 'metrics', path: '/inventory' },
      { label: 'Metrics Explorer', app: 'metrics', path: '/explorer' },
    ];
    const hostInfraEntry = { label: 'Hosts', app: 'metrics', path: '/hosts' };
    pluginsSetup.observability.navigation.registerSections(
      startDep$AndHostViewFlag$.pipe(
        map(
          ([
            [
              {
                application: { capabilities },
              },
            ],
            isInfrastructureHostsViewEnabled,
          ]) => [
            ...(capabilities.logs.show
              ? [
                  {
                    label: 'Logs',
                    sortKey: 200,
                    entries: [
                      { label: 'Stream', app: 'logs', path: '/stream' },
                      { label: 'Anomalies', app: 'logs', path: '/anomalies' },
                      { label: 'Categories', app: 'logs', path: '/log-categories' },
                    ],
                  },
                ]
              : []),
            ...(capabilities.infrastructure.show
              ? [
                  {
                    label: 'Infrastructure',
                    sortKey: 300,
                    entries: isInfrastructureHostsViewEnabled
                      ? [hostInfraEntry, ...infraEntries]
                      : infraEntries,
                  },
                ]
              : []),
          ]
        )
      )
    );

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
      // !! Need to be kept in sync with the routes in x-pack/plugins/infra/public/pages/logs/page_content.tsx
      deepLinks: [
        {
          id: 'stream',
          title: i18n.translate('xpack.infra.logs.index.streamTabTitle', {
            defaultMessage: 'Stream',
          }),
          path: '/stream',
        },
        {
          id: 'anomalies',
          title: i18n.translate('xpack.infra.logs.index.anomaliesTabTitle', {
            defaultMessage: 'Anomalies',
          }),
          path: '/anomalies',
        },
        {
          id: 'log-categories',
          title: i18n.translate('xpack.infra.logs.index.logCategoriesBetaBadgeTitle', {
            defaultMessage: 'Categories',
          }),
          path: '/log-categories',
        },
        {
          id: 'settings',
          title: i18n.translate('xpack.infra.logs.index.settingsTabTitle', {
            defaultMessage: 'Settings',
          }),
          path: '/settings',
        },
      ],
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        // mount callback should not use setup dependencies, get start dependencies instead
        const [coreStart, pluginsStart, pluginStart] = await core.getStartServices();
        const { renderApp } = await import('./apps/logs_app');

        return renderApp(coreStart, pluginsStart, pluginStart, params);
      },
    });

    // !! Need to be kept in sync with the routes in x-pack/plugins/infra/public/pages/metrics/index.tsx
    const infraDeepLinks = [
      {
        id: 'inventory',
        title: i18n.translate('xpack.infra.homePage.inventoryTabTitle', {
          defaultMessage: 'Inventory',
        }),
        path: '/inventory',
      },
      {
        id: 'metrics-explorer',
        title: i18n.translate('xpack.infra.homePage.metricsExplorerTabTitle', {
          defaultMessage: 'Metrics Explorer',
        }),
        path: '/explorer',
      },
      {
        id: 'settings',
        title: i18n.translate('xpack.infra.homePage.settingsTabTitle', {
          defaultMessage: 'Settings',
        }),
        path: '/settings',
      },
    ];
    const hostInfraDeepLink = {
      id: 'metrics-hosts',
      title: i18n.translate('xpack.infra.homePage.metricsHostsTabTitle', {
        defaultMessage: 'Hosts',
      }),
      path: '/hosts',
    };
    core.application.register({
      id: 'metrics',
      title: i18n.translate('xpack.infra.metrics.pluginTitle', {
        defaultMessage: 'Infrastructure',
      }),
      euiIconType: 'logoObservability',
      order: 8200,
      appRoute: '/app/metrics',
      category: DEFAULT_APP_CATEGORIES.observability,
      updater$: this.appUpdater$,
      deepLinks: core.uiSettings.get<boolean>(enableInfrastructureHostsView)
        ? [hostInfraDeepLink, ...infraDeepLinks]
        : infraDeepLinks,
      mount: async (params: AppMountParameters) => {
        // mount callback should not use setup dependencies, get start dependencies instead
        const [coreStart, pluginsStart, pluginStart] = await core.getStartServices();
        const { renderApp } = await import('./apps/metrics_app');

        return renderApp(coreStart, pluginsStart, pluginStart, params);
      },
    });

    startDep$AndHostViewFlag$.subscribe(
      ([_startServices, isInfrastructureHostsViewEnabled]: [
        [CoreStart, InfraClientStartDeps, InfraClientStartExports],
        boolean
      ]) => {
        this.appUpdater$.next(() => ({
          deepLinks: isInfrastructureHostsViewEnabled
            ? [hostInfraDeepLink, ...infraDeepLinks]
            : infraDeepLinks,
        }));
      }
    );

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

  start(core: InfraClientCoreStart, plugins: InfraClientStartDeps) {
    const getStartServices = (): InfraClientStartServices => [core, plugins, startContract];

    const logViews = this.logViews.start({
      http: core.http,
      dataViews: plugins.dataViews,
      search: plugins.data.search,
    });

    const startContract: InfraClientStartExports = {
      logViews,
      ContainerMetricsTable: createLazyContainerMetricsTable(getStartServices),
      HostMetricsTable: createLazyHostMetricsTable(getStartServices),
      PodMetricsTable: createLazyPodMetricsTable(getStartServices),
    };

    return startContract;
  }

  stop() {}
}
