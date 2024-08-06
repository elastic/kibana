/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AppMountParameters,
  type AppUpdater,
  type CoreStart,
  type AppDeepLink,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
  AppDeepLinkLocations,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { enableInfrastructureHostsView } from '@kbn/observability-plugin/public';
import { ObservabilityTriggerId } from '@kbn/observability-shared-plugin/common';
import { BehaviorSubject, combineLatest, from } from 'rxjs';
import { map } from 'rxjs';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { IncompatibleActionError, ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import type { InfraPublicConfig } from '../common/plugin_config_types';
import { createInventoryMetricRuleType } from './alerting/inventory';
import { createLogThresholdRuleType } from './alerting/log_threshold';
import { createMetricThresholdRuleType } from './alerting/metric_threshold';
import { ADD_LOG_STREAM_ACTION_ID, LOG_STREAM_EMBEDDABLE } from './components/log_stream/constants';
import {
  type InfraLocators,
  InfraLogsLocatorDefinition,
  InfraNodeLogsLocatorDefinition,
} from '../common/locators';
import { createMetricsFetchData, createMetricsHasData } from './metrics_overview_fetchers';
import { registerFeatures } from './register_feature';
import { InventoryViewsService } from './services/inventory_views';
import { MetricsExplorerViewsService } from './services/metrics_explorer_views';
import { TelemetryService } from './services/telemetry';
import type {
  InfraClientCoreSetup,
  InfraClientCoreStart,
  InfraClientPluginClass,
  InfraClientSetupDeps,
  InfraClientStartDeps,
  InfraClientStartExports,
} from './types';
import { getLogsHasDataFetcher, getLogsOverviewDataFetcher } from './utils/logs_overview_fetchers';
import type { LogStreamSerializedState } from './components/log_stream/types';

export class Plugin implements InfraClientPluginClass {
  public config: InfraPublicConfig;
  private inventoryViews: InventoryViewsService;
  private metricsExplorerViews?: MetricsExplorerViewsService;
  private telemetry: TelemetryService;
  private locators?: InfraLocators;
  private kibanaVersion: string;
  private isServerlessEnv: boolean;
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(context: PluginInitializerContext<InfraPublicConfig>) {
    this.config = context.config.get();

    this.inventoryViews = new InventoryViewsService();
    this.metricsExplorerViews = this.config.featureFlags.metricsExplorerEnabled
      ? new MetricsExplorerViewsService()
      : undefined;
    this.telemetry = new TelemetryService();
    this.kibanaVersion = context.env.packageInfo.version;
    this.isServerlessEnv = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(core: InfraClientCoreSetup, pluginsSetup: InfraClientSetupDeps) {
    if (pluginsSetup.home) {
      registerFeatures(pluginsSetup.home);
    }

    pluginsSetup.uiActions.registerTrigger({
      id: ObservabilityTriggerId.LogEntryContextMenu,
    });

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createInventoryMetricRuleType()
    );

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createMetricThresholdRuleType()
    );

    if (this.config.featureFlags.logsUIEnabled) {
      // fetchData `appLink` redirects to logs/stream
      pluginsSetup.observability.dashboard.register({
        appName: 'infra_logs',
        hasData: getLogsHasDataFetcher(core.getStartServices),
        fetchData: getLogsOverviewDataFetcher(core.getStartServices),
      });
    }

    pluginsSetup.observability.dashboard.register({
      appName: 'infra_metrics',
      hasData: createMetricsHasData(core.getStartServices),
      fetchData: createMetricsFetchData(core.getStartServices),
    });
    pluginsSetup.logsShared.logViews.setLogViewsStaticConfig({
      messageFields: this.config.sources?.default?.fields?.message,
    });

    const startDep$AndHostViewFlag$ = combineLatest([
      from(core.getStartServices()),
      core.settings.client.get$<boolean>(enableInfrastructureHostsView),
    ]);

    /** !! Need to be kept in sync with the deepLinks in x-pack/plugins/observability_solution/infra/public/plugin.ts */
    pluginsSetup.observabilityShared.navigation.registerSections(
      startDep$AndHostViewFlag$.pipe(
        map(
          ([
            [
              {
                application: { capabilities },
              },
            ],
            isInfrastructureHostsViewEnabled,
          ]) => {
            return [
              ...(capabilities.logs.show
                ? [
                    {
                      label: 'Logs',
                      sortKey: 200,
                      entries: [
                        {
                          label: 'Explorer',
                          app: 'observability-logs-explorer',
                          path: '/',
                          isBetaFeature: true,
                        },
                        ...(this.config.featureFlags.logsUIEnabled
                          ? [
                              { label: 'Stream', app: 'logs', path: '/stream' },
                              { label: 'Anomalies', app: 'logs', path: '/anomalies' },
                              { label: 'Categories', app: 'logs', path: '/log-categories' },
                            ]
                          : []),
                      ],
                    },
                  ]
                : []),
              ...(capabilities.infrastructure.show
                ? [
                    {
                      label: 'Infrastructure',
                      sortKey: 300,
                      entries: [
                        { label: 'Inventory', app: 'metrics', path: '/inventory' },
                        ...(this.config.featureFlags.metricsExplorerEnabled
                          ? [{ label: 'Metrics Explorer', app: 'metrics', path: '/explorer' }]
                          : []),
                        ...(isInfrastructureHostsViewEnabled
                          ? [
                              {
                                label: 'Hosts',
                                isBetaFeature: true,
                                app: 'metrics',
                                path: '/hosts',
                              },
                            ]
                          : []),
                      ],
                    },
                  ]
                : []),
            ];
          }
        )
      )
    );

    pluginsSetup.embeddable.registerReactEmbeddableFactory(LOG_STREAM_EMBEDDABLE, async () => {
      const { getLogStreamEmbeddableFactory } = await import(
        './components/log_stream/log_stream_react_embeddable'
      );
      const [coreStart, pluginDeps, pluginStart] = await core.getStartServices();
      return getLogStreamEmbeddableFactory({
        coreStart,
        pluginDeps,
        pluginStart,
      });
    });

    // Register Locators
    const logsLocator = this.config.featureFlags.logsUIEnabled
      ? pluginsSetup.share.url.locators.create(new InfraLogsLocatorDefinition({ core }))
      : undefined;
    const nodeLogsLocator = this.config.featureFlags.logsUIEnabled
      ? pluginsSetup.share.url.locators.create(new InfraNodeLogsLocatorDefinition({ core }))
      : undefined;

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createLogThresholdRuleType(core, pluginsSetup.share.url)
    );

    if (this.config.featureFlags.logsUIEnabled) {
      core.application.register({
        id: 'logs',
        title: i18n.translate('xpack.infra.logs.pluginTitle', {
          defaultMessage: 'Logs',
        }),
        euiIconType: 'logoObservability',
        order: 8100,
        appRoute: '/app/logs',
        // !! Need to be kept in sync with the routes in x-pack/plugins/observability_solution/infra/public/pages/logs/page_content.tsx
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
          const [coreStart, plugins, pluginStart] = await core.getStartServices();

          const { renderApp } = await import('./apps/logs_app');
          return renderApp(coreStart, plugins, pluginStart, params);
        },
      });
    }

    // !! Need to be kept in sync with the routes in x-pack/plugins/observability_solution/infra/public/pages/metrics/index.tsx
    const getInfraDeepLinks = ({
      hostsEnabled,
      metricsExplorerEnabled,
    }: {
      hostsEnabled: boolean;
      metricsExplorerEnabled: boolean;
    }): AppDeepLink[] => {
      const visibleIn: AppDeepLinkLocations[] = ['globalSearch'];

      return [
        {
          id: 'inventory',
          title: i18n.translate('xpack.infra.homePage.inventoryTabTitle', {
            defaultMessage: 'Inventory',
          }),
          path: '/inventory',
          visibleIn,
        },
        ...(hostsEnabled
          ? [
              {
                id: 'hosts',
                title: i18n.translate('xpack.infra.homePage.metricsHostsTabTitle', {
                  defaultMessage: 'Hosts',
                }),
                path: '/hosts',
                visibleIn,
              },
            ]
          : []),
        ...(metricsExplorerEnabled
          ? [
              {
                id: 'metrics-explorer',
                title: i18n.translate('xpack.infra.homePage.metricsExplorerTabTitle', {
                  defaultMessage: 'Metrics Explorer',
                }),
                path: '/explorer',
              },
            ]
          : []),
        {
          id: 'settings',
          title: i18n.translate('xpack.infra.homePage.settingsTabTitle', {
            defaultMessage: 'Settings',
          }),
          path: '/settings',
        },
        {
          id: 'assetDetails',
          title: '', // Internal deep link, not shown in the UI. Title is dynamically set in the app.
          path: '/detail',
          visibleIn: [],
        },
      ];
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
      deepLinks: getInfraDeepLinks({
        hostsEnabled: core.settings.client.get<boolean>(enableInfrastructureHostsView),
        metricsExplorerEnabled: this.config.featureFlags.metricsExplorerEnabled,
      }),
      mount: async (params: AppMountParameters) => {
        // mount callback should not use setup dependencies, get start dependencies instead
        const [coreStart, plugins, pluginStart] = await core.getStartServices();
        const { renderApp } = await import('./apps/metrics_app');

        const isCloudEnv = !!pluginsSetup.cloud?.isCloudEnabled;
        const isServerlessEnv = pluginsSetup.cloud?.isServerlessEnabled || this.isServerlessEnv;
        return renderApp(
          coreStart,
          { ...plugins, licenseManagement: pluginsSetup.licenseManagement },
          pluginStart,
          this.config,
          params,
          {
            kibanaVersion: this.kibanaVersion,
            isCloudEnv,
            isServerlessEnv,
          }
        );
      },
    });

    /* This exists purely to facilitate URL redirects from the old App ID ("infra"),
    to our new App IDs ("metrics" and "logs"). With version 8.0.0 we can remove this. */
    core.application.register({
      id: 'infra',
      appRoute: '/app/infra',
      title: 'infra',
      visibleIn: [],
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./apps/legacy_app');

        return renderApp(coreStart, params);
      },
    });

    startDep$AndHostViewFlag$.subscribe(
      ([_startServices, isInfrastructureHostsViewEnabled]: [
        [CoreStart, InfraClientStartDeps, InfraClientStartExports],
        boolean
      ]) => {
        this.appUpdater$.next(() => ({
          deepLinks: getInfraDeepLinks({
            hostsEnabled: isInfrastructureHostsViewEnabled,
            metricsExplorerEnabled: this.config.featureFlags.metricsExplorerEnabled,
          }),
        }));
      }
    );

    // Setup telemetry events
    this.telemetry.setup({ analytics: core.analytics });

    this.locators = {
      logsLocator,
      nodeLogsLocator,
    };

    return {
      locators: this.locators,
    };
  }

  start(core: InfraClientCoreStart, plugins: InfraClientStartDeps) {
    const inventoryViews = this.inventoryViews.start({
      http: core.http,
    });

    const metricsExplorerViews = this.metricsExplorerViews?.start({
      http: core.http,
    });

    const telemetry = this.telemetry.start();

    plugins.uiActions.registerAction<EmbeddableApiContext>({
      id: ADD_LOG_STREAM_ACTION_ID,
      grouping: [COMMON_EMBEDDABLE_GROUPING.legacy],
      order: 30,
      getDisplayName: () =>
        i18n.translate('xpack.infra.logStreamEmbeddable.displayName', {
          defaultMessage: 'Log stream (deprecated)',
        }),
      getDisplayNameTooltip: () =>
        i18n.translate('xpack.infra.logStreamEmbeddable.description', {
          defaultMessage:
            'Add a table of live streaming logs. For a more efficient experience, we recommend using the Discover Page to create a saved search instead of using Log stream.',
        }),
      getIconType: () => 'logsApp',
      isCompatible: async ({ embeddable }) => {
        return apiCanAddNewPanel(embeddable);
      },
      execute: async ({ embeddable }) => {
        if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
        embeddable.addNewPanel<LogStreamSerializedState>(
          {
            panelType: LOG_STREAM_EMBEDDABLE,
            initialState: {
              title: i18n.translate('xpack.infra.logStreamEmbeddable.title', {
                defaultMessage: 'Log stream',
              }),
            },
          },
          true
        );
      },
    });
    plugins.uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_LOG_STREAM_ACTION_ID);

    const startContract: InfraClientStartExports = {
      inventoryViews,
      metricsExplorerViews,
      telemetry,
      locators: this.locators!,
    };

    return startContract;
  }

  stop() {}
}
