/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  AppMountParameters,
} from 'kibana/public';
import { UptimeFetchDataResponse } from '../../../observability/public/typings/fetch_data_response';
import { DEFAULT_APP_CATEGORIES } from '../../../../../src/core/public';
import { UMFrontendLibs } from '../lib/lib';
import { PLUGIN } from '../../common/constants';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
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
import { kibanaService } from '../state/kibana_service';
import { fetchSnapshotCount, fetchIndexStatus, fetchPingHistogram } from '../state/api';
import { ObservabilityPluginSetup } from '../../../observability/public';

export interface ClientPluginsSetup {
  data: DataPublicPluginSetup;
  home: HomePublicPluginSetup;
  observability: ObservabilityPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
}

export interface ClientPluginsStart {
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
}

export type ClientSetup = void;
export type ClientStart = void;

export class UptimePlugin
  implements Plugin<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart> {
  constructor(_context: PluginInitializerContext) {}

  public async setup(
    core: CoreSetup<ClientPluginsStart, unknown>,
    plugins: ClientPluginsSetup
  ): Promise<void> {
    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: PLUGIN.ID,
        title: PLUGIN.TITLE,
        description: PLUGIN.DESCRIPTION,
        icon: 'uptimeApp',
        path: '/app/uptime#/',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.DATA,
      });
    }

    // This doesn't actually work
    plugins.observability.dashboard.register({
      appName: 'uptime',
      hasData: async () => {
        const status = await fetchIndexStatus();
        return status.docCount > 0;
      },
      fetchData: async ({ startTime, endTime, bucketSize }) => {
        const snapshot = await fetchSnapshotCount({
          dateRangeStart: startTime,
          dateRangeEnd: endTime,
        });
        const pings = await fetchPingHistogram({ dateStart: startTime, dateEnd: endTime });
        const response: UptimeFetchDataResponse = {
          title: 'Uptime',
          appLink: '/app/uptime#/', // Todo is there some sort of helper that handles subpaths?
          stats: {
            monitors: {
              type: 'number',
              label: 'Monitors',
              value: snapshot.total,
            },
            up: {
              type: 'number',
              label: 'Up',
              value: snapshot.up,
            },
            down: {
              type: 'number',
              label: 'Down',
              value: snapshot.down,
            },
          },
          series: {
            up: {
              label: 'Up',
              coordinates: pings.histogram.map((p) => {
                return { x: p.x!, y: p.upCount || 0 };
              }),
            },
            down: {
              label: 'Down',
              coordinates: pings.histogram.map((p) => {
                return { x: p.x!, y: p.downCount || 0 };
              }),
            },
          },
        };
        return response;
      },
    });

    core.application.register({
      appRoute: '/app/uptime#/',
      id: PLUGIN.ID,
      euiIconType: 'uptimeApp',
      order: 8400,
      title: PLUGIN.TITLE,
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, corePlugins] = await core.getStartServices();
        const { getKibanaFrameworkAdapter } = await import(
          '../lib/adapters/framework/new_platform_adapter'
        );

        const { element } = params;

        const libs: UMFrontendLibs = {
          framework: getKibanaFrameworkAdapter(coreStart, plugins, corePlugins),
        };
        return libs.framework.render(element);
      },
    });
  }

  public start(start: CoreStart, plugins: ClientPluginsStart): void {
    kibanaService.core = start;
    alertTypeInitializers.forEach((init) => {
      const alertInitializer = init({
        core: start,
        plugins,
      });
      if (
        plugins.triggers_actions_ui &&
        !plugins.triggers_actions_ui.alertTypeRegistry.has(alertInitializer.id)
      ) {
        plugins.triggers_actions_ui.alertTypeRegistry.register(alertInitializer);
      }
    });
  }

  public stop(): void {}
}
