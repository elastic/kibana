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
  PluginInitializerContext,
} from '@kbn/core/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '@kbn/data-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';

import { FeaturesPluginSetup } from '@kbn/features-plugin/public';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import {
  ExploratoryViewPublicSetup,
  ExploratoryViewPublicStart,
} from '@kbn/exploratory-view-plugin/public';
import { MapsStartApi } from '@kbn/maps-plugin/public';
import { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import {
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantPluginSetup,
} from '@kbn/observability-ai-assistant-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';

export type UxPluginSetup = void;
export type UxPluginStart = void;

export interface ApmPluginSetupDeps {
  data: DataPublicPluginSetup;
  exploratoryView: ExploratoryViewPublicSetup;
  features: FeaturesPluginSetup;
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPluginSetup;
}

export interface ApmPluginStartDeps {
  data: DataPublicPluginStart;
  home: void;
  licensing: void;
  embeddable: EmbeddableStart;
  maps?: MapsStartApi;
  inspector: InspectorPluginStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  observabilityAIAssistant: ObservabilityAIAssistantPluginStart;
  exploratoryView: ExploratoryViewPublicStart;
  dataViews: DataViewsPublicPluginStart;
  lens: LensPublicStart;
  spaces?: SpacesPluginStart;
}

async function getDataStartPlugin(core: CoreSetup) {
  const [_, startPlugins] = await core.getStartServices();
  return (startPlugins as ApmPluginStartDeps).data;
}

export class UxPlugin implements Plugin<UxPluginSetup, UxPluginStart> {
  constructor(private readonly initContext: PluginInitializerContext) {}

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
          const dataStartPlugin = await getDataStartPlugin(core);
          return dataHelper.hasRumData({
            ...params!,
            dataStartPlugin,
          });
        },
        fetchData: async (params: FetchDataParams) => {
          const dataStartPlugin = await getDataStartPlugin(core);
          const dataHelper = await getUxDataHelper();
          return dataHelper.fetchUxOverviewDate({
            ...params,
            dataStartPlugin,
          });
        },
      });

      plugins.exploratoryView.register({
        appName: 'ux',
        hasData: async (params?: HasDataParams) => {
          const dataHelper = await getUxDataHelper();
          const dataStartPlugin = await getDataStartPlugin(core);
          return dataHelper.hasRumData({
            ...params!,
            dataStartPlugin,
          });
        },
        fetchData: async (params: FetchDataParams) => {
          const dataStartPlugin = await getDataStartPlugin(core);
          const dataHelper = await getUxDataHelper();
          return dataHelper.fetchUxOverviewDate({
            ...params,
            dataStartPlugin,
          });
        },
      });
    }

    // register observability nav if user has access to plugin
    plugins.observabilityShared.navigation.registerSections(
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

    const isDev = this.initContext.env.mode.dev;

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

        const activeSpace = await (
          corePlugins as ApmPluginStartDeps
        ).spaces?.getActiveSpace();

        return renderApp({
          isDev,
          core: coreStart,
          deps: pluginSetupDeps,
          appMountParameters,
          corePlugins: corePlugins as ApmPluginStartDeps,
          spaceId: activeSpace?.id || 'default',
        });
      },
    });
  }
  public start(core: CoreStart, plugins: ApmPluginStartDeps) {}
}
