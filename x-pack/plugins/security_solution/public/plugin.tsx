/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Store, Action } from 'redux';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Plugin as IPlugin,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import { initTelemetry } from './common/lib/telemetry';
import { KibanaServices } from './common/lib/kibana/services';
import { serviceNowActionType, jiraActionType } from './common/lib/connectors';
import { PluginSetup, PluginStart, SetupPlugins, StartPlugins, StartServices } from './types';
import {
  APP_ID,
  APP_ICON,
  APP_ALERTS_PATH,
  APP_HOSTS_PATH,
  APP_OVERVIEW_PATH,
  APP_NETWORK_PATH,
  APP_TIMELINES_PATH,
  APP_MANAGEMENT_PATH,
  APP_CASES_PATH,
  SHOW_ENDPOINT_ALERTS_NAV,
  APP_ENDPOINT_ALERTS_PATH,
} from '../common/constants';
import { ConfigureEndpointDatasource } from './management/pages/policy/view/ingest_manager_integration/configure_datasource';

import { State, createStore, createInitialState } from './common/store';
import { SecurityPageName } from './app/types';
import { manageOldSiemRoutes } from './helpers';

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private kibanaVersion: string;
  private store!: Store<State, Action>;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins) {
    initTelemetry(plugins.usageCollection, APP_ID);

    plugins.home.featureCatalogue.register({
      id: APP_ID,
      title: i18n.translate('xpack.securitySolution.featureCatalogue.title', {
        defaultMessage: 'Security',
      }),
      description: i18n.translate('xpack.securitySolution.featureCatalogue.description', {
        defaultMessage: 'Explore security metrics and logs for events and alerts',
      }),
      icon: APP_ICON,
      path: APP_OVERVIEW_PATH,
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    });

    plugins.triggers_actions_ui.actionTypeRegistry.register(serviceNowActionType());
    plugins.triggers_actions_ui.actionTypeRegistry.register(jiraActionType());

    const mountSecurityFactory = async () => {
      const storage = new Storage(localStorage);
      const [coreStart, startPlugins] = await core.getStartServices();
      if (this.store == null) {
        await this.buildStore(coreStart, startPlugins, storage);
      }

      const services = {
        ...coreStart,
        ...startPlugins,
        storage,
        security: plugins.security,
      } as StartServices;
      return { coreStart, startPlugins, services, store: this.store, storage };
    };

    // Waiting for https://github.com/elastic/kibana/issues/69110
    // core.application.register({
    //   id: APP_ID,
    //   title: 'Security',
    //   appRoute: APP_PATH,
    //   navLinkStatus: AppNavLinkStatus.hidden,
    //   mount: async (params: AppMountParameters) => {
    //     const [{ application }] = await core.getStartServices();
    //     application.navigateToApp(`${APP_ID}:${SecurityPageName.overview}`, { replace: true });
    //     return () => true;
    //   },
    // });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.overview}`,
      title: i18n.translate('xpack.securitySolution.overviewPage.title', {
        defaultMessage: 'Overview',
      }),
      order: 9000,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_OVERVIEW_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services },
          { renderApp, composeLibs },
          { overviewSubPlugin },
        ] = await Promise.all([
          mountSecurityFactory(),
          this.downloadAssets(),
          this.downloadSubPlugins(),
        ]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services,
          store,
          SubPluginRoutes: overviewSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.alerts}`,
      title: i18n.translate('xpack.securitySolution.alertsPage.title', {
        defaultMessage: 'Alerts',
      }),
      order: 9001,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_ALERTS_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services, storage },
          { renderApp, composeLibs },
          { alertsSubPlugin },
        ] = await Promise.all([
          mountSecurityFactory(),
          this.downloadAssets(),
          this.downloadSubPlugins(),
        ]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services,
          store,
          SubPluginRoutes: alertsSubPlugin.start(storage).SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.hosts}`,
      title: 'Hosts',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_HOSTS_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services, storage },
          { renderApp, composeLibs },
          { hostsSubPlugin },
        ] = await Promise.all([
          mountSecurityFactory(),
          this.downloadAssets(),
          this.downloadSubPlugins(),
        ]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services,
          store,
          SubPluginRoutes: hostsSubPlugin.start(storage).SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.network}`,
      title: 'Network',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_NETWORK_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services, storage },
          { renderApp, composeLibs },
          { networkSubPlugin },
        ] = await Promise.all([
          mountSecurityFactory(),
          this.downloadAssets(),
          this.downloadSubPlugins(),
        ]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services,
          store,
          SubPluginRoutes: networkSubPlugin.start(storage).SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.timelines}`,
      title: 'Timelines',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_TIMELINES_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services },
          { renderApp, composeLibs },
          { timelinesSubPlugin },
        ] = await Promise.all([
          mountSecurityFactory(),
          this.downloadAssets(),
          this.downloadSubPlugins(),
        ]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services,
          store,
          SubPluginRoutes: timelinesSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.case}`,
      title: 'Cases',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_CASES_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services },
          { renderApp, composeLibs },
          { casesSubPlugin },
        ] = await Promise.all([
          mountSecurityFactory(),
          this.downloadAssets(),
          this.downloadSubPlugins(),
        ]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services,
          store,
          SubPluginRoutes: casesSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.management}`,
      title: 'Management',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_MANAGEMENT_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, startPlugins, store, services },
          { renderApp, composeLibs },
          { managementSubPlugin },
        ] = await Promise.all([
          mountSecurityFactory(),
          this.downloadAssets(),
          this.downloadSubPlugins(),
        ]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services,
          store,
          SubPluginRoutes: managementSubPlugin.start(coreStart, startPlugins).SubPluginRoutes,
        });
      },
    });

    if (SHOW_ENDPOINT_ALERTS_NAV) {
      core.application.register({
        id: `${APP_ID}:${SecurityPageName.endpointAlerts}`,
        title: 'Endpoint Alerts',
        order: 9002,
        euiIconType: APP_ICON,
        category: DEFAULT_APP_CATEGORIES.security,
        appRoute: APP_ENDPOINT_ALERTS_PATH,
        mount: async (params: AppMountParameters) => {
          const [
            { coreStart, startPlugins, store, services },
            { renderApp, composeLibs },
            { endpointAlertsSubPlugin },
          ] = await Promise.all([
            mountSecurityFactory(),
            this.downloadAssets(),
            this.downloadSubPlugins(),
          ]);
          return renderApp({
            ...composeLibs(coreStart),
            ...params,
            services,
            store,
            SubPluginRoutes: endpointAlertsSubPlugin.start(coreStart, startPlugins).SubPluginRoutes,
          });
        },
      });
    }

    core.application.register({
      id: 'siem',
      appRoute: 'app/siem',
      title: 'SIEM',
      navLinkStatus: 3,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        manageOldSiemRoutes(coreStart);
        return () => true;
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    KibanaServices.init({ ...core, ...plugins, kibanaVersion: this.kibanaVersion });
    plugins.ingestManager.registerDatasource('endpoint', ConfigureEndpointDatasource);

    return {};
  }

  public stop() {
    return {};
  }

  private async downloadAssets() {
    const [{ renderApp }, { composeLibs }] = await Promise.all([
      import('./app'),
      import('./common/lib/compose/kibana_compose'),
    ]);

    return {
      renderApp,
      composeLibs,
    };
  }

  private async downloadSubPlugins() {
    const {
      alertsSubPlugin,
      casesSubPlugin,
      hostsSubPlugin,
      networkSubPlugin,
      overviewSubPlugin,
      timelinesSubPlugin,
      endpointAlertsSubPlugin,
      managementSubPlugin,
    } = await import('./sub_plugins');

    return {
      alertsSubPlugin,
      casesSubPlugin,
      hostsSubPlugin,
      networkSubPlugin,
      overviewSubPlugin,
      timelinesSubPlugin,
      endpointAlertsSubPlugin,
      managementSubPlugin,
    };
  }

  private async buildStore(coreStart: CoreStart, startPlugins: StartPlugins, storage: Storage) {
    const { composeLibs } = await this.downloadAssets();

    const {
      alertsSubPlugin,
      hostsSubPlugin,
      networkSubPlugin,
      timelinesSubPlugin,
      endpointAlertsSubPlugin,
      managementSubPlugin,
    } = await this.downloadSubPlugins();

    const libs$ = new BehaviorSubject(composeLibs(coreStart));

    const alertsStart = alertsSubPlugin.start(storage);
    const hostsStart = hostsSubPlugin.start(storage);
    const networkStart = networkSubPlugin.start(storage);
    const timelinesStart = timelinesSubPlugin.start();
    const endpointAlertsStart = endpointAlertsSubPlugin.start(coreStart, startPlugins);
    const managementSubPluginStart = managementSubPlugin.start(coreStart, startPlugins);

    const timelineInitialState = {
      timeline: {
        ...timelinesStart.store.initialState.timeline!,
        timelineById: {
          ...timelinesStart.store.initialState.timeline!.timelineById,
          ...alertsStart.storageTimelines!.timelineById,
          ...hostsStart.storageTimelines!.timelineById,
          ...networkStart.storageTimelines!.timelineById,
        },
      },
    };

    this.store = createStore(
      createInitialState({
        ...hostsStart.store.initialState,
        ...networkStart.store.initialState,
        ...timelineInitialState,
        ...endpointAlertsStart.store.initialState,
        ...managementSubPluginStart.store.initialState,
      }),
      {
        ...hostsStart.store.reducer,
        ...networkStart.store.reducer,
        ...timelinesStart.store.reducer,
        ...endpointAlertsStart.store.reducer,
        ...managementSubPluginStart.store.reducer,
      },
      libs$.pipe(pluck('apolloClient')),
      storage,
      [
        ...(endpointAlertsStart.store.middleware ?? []),
        ...(managementSubPluginStart.store.middleware ?? []),
      ]
    );
  }
}
