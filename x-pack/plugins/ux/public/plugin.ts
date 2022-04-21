/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import {
  FetchDataParams,
  HasDataParams,
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
} from '@kbn/core/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '@kbn/data-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';

import { FeaturesPluginSetup } from '@kbn/features-plugin/public';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { MapsStartApi } from '@kbn/maps-plugin/public';
import { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';

export type UxPluginSetup = void;
export type UxPluginStart = void;

export interface ApmPluginSetupDeps {
  data: DataPublicPluginSetup;
  features: FeaturesPluginSetup;
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  observability: ObservabilityPublicSetup;
}

export interface ApmPluginStartDeps {
  data: DataPublicPluginStart;
  home: void;
  licensing: void;
  embeddable: EmbeddableStart;
  maps?: MapsStartApi;
  inspector: InspectorPluginStart;
  observability: ObservabilityPublicStart;
}

export class UxPlugin implements Plugin<UxPluginSetup, UxPluginStart> {
  constructor() {}

  public setup(core: CoreSetup, plugins: ApmPluginSetupDeps) {
    const pluginSetupDeps = plugins;

    if (plugins.observability) {
      const getUxDataHelper = async () => {
        const { fetchUxOverviewDate, hasRumData, createCallApmApi } =
          await import('./components/app/rum_dashboard/ux_overview_fetchers');
        // have to do this here as well in case app isn't mounted yet
        createCallApmApi(core);

        return { fetchUxOverviewDate, hasRumData };
      };

      plugins.observability.dashboard.register({
        appName: 'ux',
        hasData: async (params?: HasDataParams) => {
          const dataHelper = await getUxDataHelper();
          return await dataHelper.hasRumData(params!);
        },
        fetchData: async (params: FetchDataParams) => {
          const dataHelper = await getUxDataHelper();
          return await dataHelper.fetchUxOverviewDate(params);
        },
      });
    }

    // register observability nav if user has access to plugin
    plugins.observability.navigation.registerSections(
      from(core.getStartServices()).pipe(
        map(([coreStart]) => {
          // checking apm capability, since ux for now doesn't have it's
          // own capability
          if (coreStart.application.capabilities.apm.show) {
            return [
              // UX navigation
              {
                label: 'User Experience',
                sortKey: 600,
                entries: [
                  {
                    label: i18n.translate('xpack.ux.overview.heading', {
                      defaultMessage: 'Dashboard',
                    }),
                    app: 'ux',
                    path: '/',
                    matchFullPath: true,
                    ignoreTrailingSlash: true,
                  },
                ],
              },
            ];
          }

          return [];
        })
      )
    );

    core.application.register({
      id: 'ux',
      title: 'User Experience',
      order: 8500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
      // navLinkStatus: config.ui.enabled
      //   ? AppNavLinkStatus.default
      //   : AppNavLinkStatus.hidden,
      keywords: [
        'RUM',
        'Real User Monitoring',
        'DEM',
        'Digital Experience Monitoring',
        'EUM',
        'End User Monitoring',
        'UX',
        'Javascript',
        'APM',
        'Mobile',
        'digital',
        'performance',
        'web performance',
        'web perf',
      ],
      async mount(appMountParameters: AppMountParameters<unknown>) {
        // Load application bundle and Get start service
        const [{ renderApp }, [coreStart, corePlugins]] = await Promise.all([
          import('./application/ux_app'),
          core.getStartServices(),
        ]);

        return renderApp({
          core: coreStart,
          deps: pluginSetupDeps,
          appMountParameters,
          corePlugins: corePlugins as ApmPluginStartDeps,
        });
      },
    });
  }
  public start(core: CoreStart, plugins: ApmPluginStartDeps) {}
}
