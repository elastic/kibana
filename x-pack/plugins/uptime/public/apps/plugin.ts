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
} from 'kibana/public';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { SharePluginSetup, SharePluginStart } from '../../../../../src/plugins/share/public';
import { DiscoverStart } from '../../../../../src/plugins/discover/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../../src/core/public';

import type { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../triggers_actions_ui/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';

import { alertTypeInitializers, legacyAlertTypeInitializers } from '../lib/alert_types';
import { FleetStart } from '../../../fleet/public';
import {
  FetchDataParams,
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '../../../observability/public';
import { PLUGIN } from '../../common/constants/plugin';
import { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public';
import {
  LazySyntheticsPolicyCreateExtension,
  LazySyntheticsPolicyEditExtension,
} from '../components/fleet_package';
import { LazySyntheticsCustomAssetsExtension } from '../components/fleet_package/lazy_synthetics_custom_assets_extension';
import { Start as InspectorPluginStart } from '../../../../../src/plugins/inspector/public';
import { CasesUiStart } from '../../../cases/public';
import { uptimeOverviewNavigatorParams } from './locators/overview';
import { CloudSetup } from '../../../cloud/public';

export interface ClientPluginsSetup {
  home?: HomePublicPluginSetup;
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  cloud?: CloudSetup;
}

export interface ClientPluginsStart {
  fleet?: FleetStart;
  data: DataPublicPluginStart;
  discover: DiscoverStart;
  inspector: InspectorPluginStart;
  embeddable: EmbeddableStart;
  observability: ObservabilityPublicStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  cases: CasesUiStart;
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
      const { UptimeDataHelper } = await import('./uptime_overview_fetcher');

      return UptimeDataHelper(coreStart);
    };

    plugins.share.url.locators.create(uptimeOverviewNavigatorParams);

    plugins.observability.dashboard.register({
      appName: 'synthetics',
      hasData: async () => {
        const dataHelper = await getUptimeDataHelper();
        const status = await dataHelper.indexStatus();
        return { hasData: status.docCount > 0, indices: status.indices };
      },
      fetchData: async (params: FetchDataParams) => {
        const dataHelper = await getUptimeDataHelper();
        return await dataHelper.overviewData(params);
      },
    });

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
                    label: i18n.translate('xpack.uptime.overview.heading', {
                      defaultMessage: 'Monitors',
                    }),
                    app: 'uptime',
                    path: '/',
                    matchFullPath: true,
                    ignoreTrailingSlash: true,
                  },
                  {
                    label: i18n.translate('xpack.uptime.certificatesPage.heading', {
                      defaultMessage: 'TLS Certificates',
                    }),
                    app: 'uptime',
                    path: '/certificates',
                    matchFullPath: true,
                  },
                ],
              },
            ];
          }

          return [];
        })
      )
    );

    const { observabilityRuleTypeRegistry } = plugins.observability;

    core.getStartServices().then(([coreStart, clientPluginsStart]) => {
      alertTypeInitializers.forEach((init) => {
        const alertInitializer = init({
          core: coreStart,
          plugins: clientPluginsStart,
        });
        if (
          clientPluginsStart.triggersActionsUi &&
          !clientPluginsStart.triggersActionsUi.ruleTypeRegistry.has(alertInitializer.id)
        ) {
          observabilityRuleTypeRegistry.register(alertInitializer);
        }
      });

      legacyAlertTypeInitializers.forEach((init) => {
        const alertInitializer = init({
          core: coreStart,
          plugins: clientPluginsStart,
        });
        if (
          clientPluginsStart.triggersActionsUi &&
          !clientPluginsStart.triggersActionsUi.ruleTypeRegistry.has(alertInitializer.id)
        ) {
          plugins.triggersActionsUi.ruleTypeRegistry.register(alertInitializer);
        }
      });
    });

    core.application.register({
      id: PLUGIN.ID,
      euiIconType: 'logoObservability',
      order: 8400,
      title: PLUGIN.TITLE,
      category: DEFAULT_APP_CATEGORIES.observability,
      keywords: [
        'Synthetics',
        'pings',
        'checks',
        'availability',
        'response duration',
        'response time',
        'outside in',
        'reachability',
        'reachable',
        'digital',
        'performance',
        'web performance',
        'web perf',
      ],
      deepLinks: [
        { id: 'Down monitors', title: 'Down monitors', path: '/?statusFilter=down' },
        { id: 'Certificates', title: 'TLS Certificates', path: '/certificates' },
        { id: 'Settings', title: 'Settings', path: '/settings' },
      ],
      mount: async (params: AppMountParameters) => {
        const [coreStart, corePlugins] = await core.getStartServices();

        const { renderApp } = await import('./render_app');
        return renderApp(coreStart, plugins, corePlugins, params, this.initContext.env.mode.dev);
      },
    });
  }

  public start(start: CoreStart, plugins: ClientPluginsStart): void {
    if (plugins.fleet) {
      const { registerExtension } = plugins.fleet;

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
  }

  public stop(): void {}
}
