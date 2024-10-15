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
import {
  METRICS_EXPLORER_LOCATOR_ID,
  MetricsExplorerLocatorParams,
  ObservabilityTriggerId,
} from '@kbn/observability-shared-plugin/common';
import { BehaviorSubject, combineLatest, from } from 'rxjs';
import { map } from 'rxjs';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { IncompatibleActionError, ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import {
  ASSET_DETAILS_LOCATOR_ID,
  INVENTORY_LOCATOR_ID,
  type AssetDetailsLocatorParams,
  type InventoryLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { OBSERVABILITY_ENABLE_LOGS_STREAM } from '@kbn/management-settings-ids';
import { NavigationEntry } from '@kbn/observability-shared-plugin/public';
import type { InfraPublicConfig } from '../common/plugin_config_types';
import { createInventoryMetricRuleType } from './alerting/inventory';
import { createLogThresholdRuleType } from './alerting/log_threshold';
import { createMetricThresholdRuleType } from './alerting/metric_threshold';
import { ADD_LOG_STREAM_ACTION_ID, LOG_STREAM_EMBEDDABLE } from './components/log_stream/constants';
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
import {
  hostsTitle,
  inventoryTitle,
  logsTitle,
  metricsExplorerTitle,
  metricsTitle,
} from './translations';
import { LogsAppRoutes, LogsRoute, getLogsAppRoutes } from './pages/logs/routes';

export class Plugin implements InfraClientPluginClass {
  public config: InfraPublicConfig;
  private inventoryViews: InventoryViewsService;
  private metricsExplorerViews?: MetricsExplorerViewsService;
  private telemetry: TelemetryService;
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
    const isLogsStreamEnabled = core.uiSettings.get(OBSERVABILITY_ENABLE_LOGS_STREAM, false);

    if (pluginsSetup.home) {
      registerFeatures(pluginsSetup.home);
    }

    pluginsSetup.uiActions.registerTrigger({
      id: ObservabilityTriggerId.LogEntryContextMenu,
    });

    const assetDetailsLocator =
      pluginsSetup.share.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);
    const inventoryLocator =
      pluginsSetup.share.url.locators.get<InventoryLocatorParams>(INVENTORY_LOCATOR_ID);
    const metricsExplorerLocator =
      pluginsSetup.share.url.locators.get<MetricsExplorerLocatorParams>(
        METRICS_EXPLORER_LOCATOR_ID
      );

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createInventoryMetricRuleType({ assetDetailsLocator, inventoryLocator })
    );

    pluginsSetup.observability.observabilityRuleTypeRegistry.register(
      createMetricThresholdRuleType({ assetDetailsLocator, metricsExplorerLocator })
    );

    if (this.config.featureFlags.logsUIEnabled) {
      // fetchData `appLink` redirects to logs explorer
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

    const logRoutes = getLogsAppRoutes({ isLogsStreamEnabled });

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
            const { infrastructure, logs } = capabilities;
            return [
              ...(logs.show
                ? [
                    {
                      label: logsTitle,
                      sortKey: 200,
                      entries: getLogsNavigationEntries({
                        capabilities,
                        config: this.config,
                        routes: logRoutes,
                      }),
                    },
                  ]
                : []),
              ...(infrastructure.show
                ? [
                    {
                      label: metricsTitle,
                      sortKey: 300,
                      entries: [
                        {
                          label: inventoryTitle,
                          app: 'metrics',
                          path: '/inventory',
                        },
                        ...(this.config.featureFlags.metricsExplorerEnabled
                          ? [
                              {
                                label: metricsExplorerTitle,
                                app: 'metrics',
                                path: '/explorer',
                              },
                            ]
                          : []),
                        ...(isInfrastructureHostsViewEnabled
                          ? [
                              {
                                label: hostsTitle,
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
        deepLinks: Object.values(logRoutes),
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
          title: inventoryTitle,
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
    return {};
  }

  start(core: InfraClientCoreStart, plugins: InfraClientStartDeps) {
    const { http, uiSettings } = core;
    const isLogsStreamEnabled = uiSettings.get(OBSERVABILITY_ENABLE_LOGS_STREAM, false);
    const inventoryViews = this.inventoryViews.start({ http });
    const metricsExplorerViews = this.metricsExplorerViews?.start({ http });
    const telemetry = this.telemetry.start();

    if (isLogsStreamEnabled) {
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
    }

    const startContract: InfraClientStartExports = {
      inventoryViews,
      metricsExplorerViews,
      telemetry,
    };

    return startContract;
  }

  stop() {}
}

const getLogsNavigationEntries = ({
  capabilities,
  config,
  routes,
}: {
  capabilities: CoreStart['application']['capabilities'];
  config: InfraPublicConfig;
  routes: LogsAppRoutes;
}) => {
  const entries: NavigationEntry[] = [];

  if (!config.featureFlags.logsUIEnabled) return entries;

  if (capabilities.discover?.show && capabilities.fleet?.read) {
    entries.push({
      label: 'Explorer',
      app: 'observability-logs-explorer',
      path: '/',
      isBetaFeature: true,
    });
  }

  // Display Stream nav entry when Logs Stream is enabled
  if (routes.stream) entries.push(createNavEntryFromRoute(routes.stream));
  // Display always Logs Anomalies and Logs Categories entries
  entries.push(createNavEntryFromRoute(routes.logsAnomalies));
  entries.push(createNavEntryFromRoute(routes.logsCategories));
  // Display Logs Settings entry when Logs Stream is not enabled
  if (!routes.stream) entries.push(createNavEntryFromRoute(routes.settings));

  return entries;
};

const createNavEntryFromRoute = ({ path, title }: LogsRoute): NavigationEntry => ({
  app: 'logs',
  label: title,
  path,
});
