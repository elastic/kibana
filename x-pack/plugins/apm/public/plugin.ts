/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ConfigSchema } from '.';
import {
  AppMountParameters,
  AppNavLinkStatus,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/public';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public';
import type { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import type {
  PluginSetupContract as AlertingPluginPublicSetup,
  PluginStartContract as AlertingPluginPublicStart,
} from '../../alerting/public';
import type { FeaturesPluginSetup } from '../../features/public';
import type { LicensingPluginSetup } from '../../licensing/public';
import type { MapsStartApi } from '../../maps/public';
import type { MlPluginSetup, MlPluginStart } from '../../ml/public';
import type {
  FetchDataParams,
  HasDataParams,
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '../../observability/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../triggers_actions_ui/public';
import { registerApmAlerts } from './components/alerting/register_apm_alerts';
import { featureCatalogueEntry } from './featureCatalogueEntry';

export type ApmPluginSetup = ReturnType<ApmPlugin['setup']>;

export type ApmPluginStart = void;

export interface ApmPluginSetupDeps {
  alerting?: AlertingPluginPublicSetup;
  data: DataPublicPluginSetup;
  features: FeaturesPluginSetup;
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  ml?: MlPluginSetup;
  observability: ObservabilityPublicSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

export interface ApmPluginStartDeps {
  alerting?: AlertingPluginPublicStart;
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  home: void;
  licensing: void;
  maps?: MapsStartApi;
  ml?: MlPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  observability: ObservabilityPublicStart;
}

export class ApmPlugin implements Plugin<ApmPluginSetup, ApmPluginStart> {
  constructor(
    private readonly initializerContext: PluginInitializerContext<ConfigSchema>
  ) {
    this.initializerContext = initializerContext;
  }
  public setup(core: CoreSetup, plugins: ApmPluginSetupDeps) {
    const config = this.initializerContext.config.get();
    const pluginSetupDeps = plugins;

    if (pluginSetupDeps.home) {
      pluginSetupDeps.home.environment.update({ apmUi: true });
      pluginSetupDeps.home.featureCatalogue.register(featureCatalogueEntry);
    }

    const servicesTitle = i18n.translate('xpack.apm.navigation.servicesTitle', {
      defaultMessage: 'Services',
    });
    const tracesTitle = i18n.translate('xpack.apm.navigation.tracesTitle', {
      defaultMessage: 'Traces',
    });
    const serviceMapTitle = i18n.translate(
      'xpack.apm.navigation.serviceMapTitle',
      { defaultMessage: 'Service Map' }
    );

    // register observability nav if user has access to plugin
    plugins.observability.navigation.registerSections(
      from(core.getStartServices()).pipe(
        map(([coreStart]) => {
          if (coreStart.application.capabilities.apm.show) {
            return [
              // APM navigation
              {
                label: 'APM',
                sortKey: 400,
                entries: [
                  { label: servicesTitle, app: 'apm', path: '/services' },
                  { label: tracesTitle, app: 'apm', path: '/traces' },
                  { label: serviceMapTitle, app: 'apm', path: '/service-map' },
                ],
              },

              // UX navigation
              {
                label: 'User Experience',
                sortKey: 600,
                entries: [
                  {
                    label: i18n.translate('xpack.apm.ux.overview.heading', {
                      defaultMessage: 'Overview',
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

    const getApmDataHelper = async () => {
      const {
        fetchObservabilityOverviewPageData,
        getHasData,
        createCallApmApi,
      } = await import('./services/rest/apm_observability_overview_fetchers');
      // have to do this here as well in case app isn't mounted yet
      createCallApmApi(core);

      return { fetchObservabilityOverviewPageData, getHasData };
    };
    plugins.observability.dashboard.register({
      appName: 'apm',
      hasData: async () => {
        const dataHelper = await getApmDataHelper();
        return await dataHelper.getHasData();
      },
      fetchData: async (params: FetchDataParams) => {
        const dataHelper = await getApmDataHelper();
        return await dataHelper.fetchObservabilityOverviewPageData(params);
      },
    });

    const getUxDataHelper = async () => {
      const {
        fetchUxOverviewDate,
        hasRumData,
        createCallApmApi,
      } = await import('./components/app/RumDashboard/ux_overview_fetchers');
      // have to do this here as well in case app isn't mounted yet
      createCallApmApi(core);

      return { fetchUxOverviewDate, hasRumData };
    };

    const { observabilityRuleTypeRegistry } = plugins.observability;

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

    core.application.register({
      id: 'apm',
      title: 'APM',
      order: 8300,
      euiIconType: 'logoObservability',
      appRoute: '/app/apm',
      icon: 'plugins/apm/public/icon.svg',
      category: DEFAULT_APP_CATEGORIES.observability,
      deepLinks: [
        { id: 'services', title: servicesTitle, path: '/services' },
        { id: 'traces', title: tracesTitle, path: '/traces' },
        { id: 'service-map', title: serviceMapTitle, path: '/service-map' },
      ],

      async mount(appMountParameters: AppMountParameters<unknown>) {
        // Load application bundle and Get start services
        const [{ renderApp }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        return renderApp({
          coreStart,
          pluginsSetup: pluginSetupDeps,
          appMountParameters,
          config,
          pluginsStart: pluginsStart as ApmPluginStartDeps,
          observabilityRuleTypeRegistry,
        });
      },
    });

    registerApmAlerts(observabilityRuleTypeRegistry);

    core.application.register({
      id: 'ux',
      title: 'User Experience',
      order: 8500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
      navLinkStatus: config.ui.enabled
        ? AppNavLinkStatus.default
        : AppNavLinkStatus.hidden,
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
          import('./application/uxApp'),
          core.getStartServices(),
        ]);

        return renderApp({
          core: coreStart,
          deps: pluginSetupDeps,
          appMountParameters,
          config,
          corePlugins: corePlugins as ApmPluginStartDeps,
          observabilityRuleTypeRegistry,
        });
      },
    });

    return {};
  }
  public start(core: CoreStart, plugins: ApmPluginStartDeps) {}
}
