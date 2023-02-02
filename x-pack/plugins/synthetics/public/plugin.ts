/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  AppMountParameters,
} from '@kbn/core/public';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';

import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';

import { FleetStart } from '@kbn/fleet-plugin/public';
import {
  enableNewSyntheticsView,
  FetchDataParams,
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import { CasesUiStart } from '@kbn/cases-plugin/public';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { PLUGIN } from '../common/constants/plugin';
import { OVERVIEW_ROUTE } from '../common/constants/ui';
import {
  LazySyntheticsPolicyCreateExtension,
  LazySyntheticsPolicyEditExtension,
} from './legacy_uptime/components/fleet_package';
import { LazySyntheticsCustomAssetsExtension } from './legacy_uptime/components/fleet_package/lazy_synthetics_custom_assets_extension';
import { uptimeOverviewNavigatorParams } from './apps/locators/overview';
import {
  uptimeAlertTypeInitializers,
  legacyAlertTypeInitializers,
} from './legacy_uptime/lib/alert_types';
import { monitorDetailNavigatorParams } from './apps/locators/monitor_detail';
import { editMonitorNavigatorParams } from './apps/locators/edit_monitor';
import { setStartServices } from './kibana_services';
import { syntheticsAlertTypeInitializers } from './apps/synthetics/lib/alert_types';

export interface ClientPluginsSetup {
  home?: HomePublicPluginSetup;
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  cloud?: CloudSetup;
}

export interface ClientPluginsStart {
  fleet: FleetStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  discover: DiscoverStart;
  inspector: InspectorPluginStart;
  embeddable: EmbeddableStart;
  observability: ObservabilityPublicStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  cases: CasesUiStart;
  dataViews: DataViewsPublicPluginStart;
  spaces: SpacesPluginStart;
  cloud?: CloudStart;
  appName: string;
  storage: IStorageWrapper;
  application: CoreStart['application'];
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  docLinks: DocLinksStart;
  uiSettings: CoreStart['uiSettings'];
  usageCollection: UsageCollectionStart;
  savedObjects: CoreStart['savedObjects'];
}

export interface UptimePluginServices extends Partial<CoreStart> {
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  storage: IStorageWrapper;
}

export type ClientSetup = void;
export type ClientStart = void;

export class UptimePlugin
  implements Plugin<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart>
{
  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup<ClientPluginsStart, unknown>, plugins: ClientPluginsSetup): void {
    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: PLUGIN.ID,
        title: PLUGIN.TITLE,
        description: PLUGIN.DESCRIPTION,
        icon: 'uptimeApp',
        path: '/app/uptime',
        showOnHomePage: false,
        category: 'data',
      });
    }
    const getUptimeDataHelper = async () => {
      const [coreStart] = await core.getStartServices();
      const { UptimeDataHelper } = await import('./legacy_uptime/app/uptime_overview_fetcher');

      return UptimeDataHelper(coreStart);
    };

    plugins.share.url.locators.create(uptimeOverviewNavigatorParams);
    plugins.share.url.locators.create(monitorDetailNavigatorParams);
    plugins.share.url.locators.create(editMonitorNavigatorParams);

    plugins.observability.dashboard.register({
      appName: 'synthetics',
      hasData: async () => {
        const dataHelper = await getUptimeDataHelper();
        const status = await dataHelper.indexStatus();
        return { hasData: status.indexExists, indices: status.indices };
      },
      fetchData: async (params: FetchDataParams) => {
        const dataHelper = await getUptimeDataHelper();
        return await dataHelper.overviewData(params);
      },
    });
    const isSyntheticsViewEnabled = core.uiSettings.get<boolean>(enableNewSyntheticsView);

    registerUptimeRoutesWithNavigation(core, plugins, isSyntheticsViewEnabled);

    core.getStartServices().then(([coreStart, clientPluginsStart]) => {});

    const appKeywords = [
      'Synthetics',
      'availability',
      'browser',
      'checks',
      'digital',
      'reachability',
      'reachable',
      'response duration',
      'response time',
      'monitors',
      'outside in',
      'performance',
      'pings',
      'web performance',
      'web perf',
    ];

    core.application.register({
      id: PLUGIN.ID,
      euiIconType: 'logoObservability',
      order: 8400,
      title: PLUGIN.TITLE,
      category: DEFAULT_APP_CATEGORIES.observability,
      keywords: appKeywords,
      deepLinks: [
        { id: 'Down monitors', title: 'Down monitors', path: '/?statusFilter=down' },
        { id: 'Certificates', title: 'TLS Certificates', path: '/certificates' },
        { id: 'Settings', title: 'Settings', path: '/settings' },
      ],
      mount: async (params: AppMountParameters) => {
        const [coreStart, corePlugins] = await core.getStartServices();
        const { renderApp } = await import('./legacy_uptime/app/render_app');
        return renderApp(coreStart, plugins, corePlugins, params, this.initContext.env.mode.dev);
      },
    });

    if (isSyntheticsViewEnabled) {
      // Register the Synthetics UI plugin
      core.application.register({
        id: 'synthetics',
        euiIconType: 'logoObservability',
        order: 8400,
        title:
          PLUGIN.SYNTHETICS +
          i18n.translate('xpack.synthetics.overview.headingBeta', {
            defaultMessage: ' (beta)',
          }),
        category: DEFAULT_APP_CATEGORIES.observability,
        keywords: appKeywords,
        deepLinks: [],
        mount: async (params: AppMountParameters) => {
          const [coreStart, corePlugins] = await core.getStartServices();

          const { renderApp } = await import('./apps/synthetics/render_app');
          return renderApp(coreStart, plugins, corePlugins, params, this.initContext.env.mode.dev);
        },
      });
    }
  }

  public start(coreStart: CoreStart, pluginsStart: ClientPluginsStart): void {
    const { triggersActionsUi } = pluginsStart;

    const { registerExtension } = pluginsStart.fleet;
    setStartServices(coreStart);
    registerUptimeFleetExtensions(registerExtension);

    syntheticsAlertTypeInitializers.forEach((init) => {
      const { observabilityRuleTypeRegistry } = pluginsStart.observability;

      const alertInitializer = init({
        core: coreStart,
        plugins: pluginsStart,
      });
      if (!triggersActionsUi.ruleTypeRegistry.has(alertInitializer.id)) {
        observabilityRuleTypeRegistry.register(alertInitializer);
      }
    });

    uptimeAlertTypeInitializers.forEach((init) => {
      const { observabilityRuleTypeRegistry } = pluginsStart.observability;

      const alertInitializer = init({
        core: coreStart,
        plugins: pluginsStart,
      });
      if (!triggersActionsUi.ruleTypeRegistry.has(alertInitializer.id)) {
        observabilityRuleTypeRegistry.register(alertInitializer);
      }
    });

    legacyAlertTypeInitializers.forEach((init) => {
      const alertInitializer = init({
        core: coreStart,
        plugins: pluginsStart,
      });
      if (!triggersActionsUi.ruleTypeRegistry.has(alertInitializer.id)) {
        triggersActionsUi.ruleTypeRegistry.register(alertInitializer);
      }
    });
  }

  public stop(): void {}
}

function registerUptimeRoutesWithNavigation(
  core: CoreSetup<ClientPluginsStart, unknown>,
  plugins: ClientPluginsSetup,
  isSyntheticsViewEnabled: boolean
) {
  plugins.observability.navigation.registerSections(
    from(core.getStartServices()).pipe(
      map(([coreStart]) => {
        if (coreStart.application.capabilities.uptime.show) {
          return [
            {
              label: 'Uptime',
              sortKey: 500,
              entries: [
                {
                  label: i18n.translate('xpack.synthetics.overview.uptimeHeading', {
                    defaultMessage: 'Uptime Monitors',
                  }),
                  app: 'uptime',
                  path: '/',
                  matchFullPath: true,
                  ignoreTrailingSlash: true,
                },
                {
                  label: i18n.translate('xpack.synthetics.certificatesPage.heading', {
                    defaultMessage: 'TLS Certificates',
                  }),
                  app: 'uptime',
                  path: '/certificates',
                  matchFullPath: true,
                },
                ...(isSyntheticsViewEnabled
                  ? [
                      {
                        label: i18n.translate('xpack.synthetics.overview.headingBetaSection', {
                          defaultMessage: 'Synthetics',
                        }),
                        app: 'synthetics',
                        path: OVERVIEW_ROUTE,
                        matchFullPath: false,
                        ignoreTrailingSlash: true,
                        isBetaFeature: true,
                      },
                    ]
                  : []),
              ],
            },
          ];
        }

        return [];
      })
    )
  );
}

function registerUptimeFleetExtensions(registerExtension: FleetStart['registerExtension']) {
  registerExtension({
    package: 'synthetics',
    view: 'package-policy-create',
    Component: LazySyntheticsPolicyCreateExtension,
  });

  registerExtension({
    package: 'synthetics',
    view: 'package-policy-edit',
    useLatestPackageVersion: true,
    Component: LazySyntheticsPolicyEditExtension,
  });

  registerExtension({
    package: 'synthetics',
    view: 'package-detail-assets',
    Component: LazySyntheticsCustomAssetsExtension,
  });
}
