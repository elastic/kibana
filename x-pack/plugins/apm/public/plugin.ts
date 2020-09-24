/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigSchema } from '.';
import {
  FetchDataParams,
  ObservabilityPluginSetup,
} from '../../observability/public';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import {
  PluginSetupContract as AlertingPluginPublicSetup,
  PluginStartContract as AlertingPluginPublicStart,
} from '../../alerts/public';
import { FeaturesPluginSetup } from '../../features/public';
import { LicensingPluginSetup } from '../../licensing/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../triggers_actions_ui/public';
import { featureCatalogueEntry } from './featureCatalogueEntry';
import { toggleAppLinkInNav } from './toggleAppLinkInNav';
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { registerApmAlerts } from './components/alerting/register_apm_alerts';

export type ApmPluginSetup = void;
export type ApmPluginStart = void;

export interface ApmPluginSetupDeps {
  alerts?: AlertingPluginPublicSetup;
  data: DataPublicPluginSetup;
  features: FeaturesPluginSetup;
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
  observability?: ObservabilityPluginSetup;
}

export interface ApmPluginStartDeps {
  alerts?: AlertingPluginPublicStart;
  data: DataPublicPluginStart;
  home: void;
  licensing: void;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
  embeddable: EmbeddableStart;
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

    if (plugins.observability) {
      const getApmDataHelper = async () => {
        const {
          fetchOverviewPageData,
          hasData,
          createCallApmApi,
        } = await import('./services/rest/apm_overview_fetchers');
        // have to do this here as well in case app isn't mounted yet
        createCallApmApi(core.http);

        return { fetchOverviewPageData, hasData };
      };
      plugins.observability.dashboard.register({
        appName: 'apm',
        hasData: async () => {
          const dataHelper = await getApmDataHelper();
          return await dataHelper.hasData();
        },
        fetchData: async (params: FetchDataParams) => {
          const dataHelper = await getApmDataHelper();
          return await dataHelper.fetchOverviewPageData(params);
        },
      });
    }

    core.application.register({
      id: 'apm',
      title: 'APM',
      order: 8300,
      euiIconType: 'logoObservability',
      appRoute: '/app/apm',
      icon: 'plugins/apm/public/icon.svg',
      category: DEFAULT_APP_CATEGORIES.observability,

      async mount(params: AppMountParameters<unknown>) {
        // Load application bundle and Get start services
        const [{ renderApp }, [coreStart]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        return renderApp(coreStart, pluginSetupDeps, params, config);
      },
    });

    core.application.register({
      id: 'ux',
      title: 'User Experience',
      order: 8500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,

      async mount(params: AppMountParameters<unknown>) {
        // Load application bundle and Get start service
        const [{ renderApp }, [coreStart, corePlugins]] = await Promise.all([
          import('./application/csmApp'),
          core.getStartServices(),
        ]);

        return renderApp(
          coreStart,
          pluginSetupDeps,
          params,
          config,
          corePlugins as ApmPluginStartDeps
        );
      },
    });
  }
  public start(core: CoreStart, plugins: ApmPluginStartDeps) {
    toggleAppLinkInNav(core, this.initializerContext.config.get());
    registerApmAlerts(plugins.triggers_actions_ui.alertTypeRegistry);
  }
}
