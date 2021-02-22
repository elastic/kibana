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
import { DEFAULT_APP_CATEGORIES } from '../../../../../src/core/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../src/plugins/home/public';
import { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../triggers_actions_ui/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import { alertTypeInitializers } from '../lib/alert_types';
import { FetchDataParams, ObservabilityPluginSetup } from '../../../observability/public';
import { PLUGIN } from '../../common/constants/plugin';

export interface ClientPluginsSetup {
  data: DataPublicPluginSetup;
  home?: HomePublicPluginSetup;
  observability: ObservabilityPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

export interface ClientPluginsStart {
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export type ClientSetup = void;
export type ClientStart = void;

export class UptimePlugin
  implements Plugin<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart> {
  constructor(_context: PluginInitializerContext) {}

  public setup(core: CoreSetup<ClientPluginsStart, unknown>, plugins: ClientPluginsSetup): void {
    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: PLUGIN.ID,
        title: PLUGIN.TITLE,
        description: PLUGIN.DESCRIPTION,
        icon: 'uptimeApp',
        path: '/app/uptime',
        showOnHomePage: false,
        category: FeatureCatalogueCategory.DATA,
      });
    }
    const getUptimeDataHelper = async () => {
      const [coreStart] = await core.getStartServices();
      const { UptimeDataHelper } = await import('./uptime_overview_fetcher');

      return UptimeDataHelper(coreStart);
    };
    plugins.observability.dashboard.register({
      appName: 'uptime',
      hasData: async () => {
        const dataHelper = await getUptimeDataHelper();
        const status = await dataHelper.indexStatus();
        return status.docCount > 0;
      },
      fetchData: async (params: FetchDataParams) => {
        const dataHelper = await getUptimeDataHelper();
        return await dataHelper.overviewData(params);
      },
    });

    core.application.register({
      id: PLUGIN.ID,
      euiIconType: 'logoObservability',
      order: 8400,
      title: PLUGIN.TITLE,
      category: DEFAULT_APP_CATEGORIES.observability,
      meta: {
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
        searchDeepLinks: [
          { id: 'Down monitors', title: 'Down monitors', path: '/?statusFilter=down' },
          { id: 'Certificates', title: 'TLS Certificates', path: '/certificates' },
          { id: 'Settings', title: 'Settings', path: '/settings' },
        ],
      },
      mount: async (params: AppMountParameters) => {
        const [coreStart, corePlugins] = await core.getStartServices();

        const { renderApp } = await import('./render_app');

        return renderApp(coreStart, plugins, corePlugins, params);
      },
    });
  }

  public start(start: CoreStart, plugins: ClientPluginsStart): void {
    alertTypeInitializers.forEach((init) => {
      const alertInitializer = init({
        core: start,
        plugins,
      });
      if (
        plugins.triggersActionsUi &&
        !plugins.triggersActionsUi.alertTypeRegistry.has(alertInitializer.id)
      ) {
        plugins.triggersActionsUi.alertTypeRegistry.register(alertInitializer);
      }
    });
  }

  public stop(): void {}
}
