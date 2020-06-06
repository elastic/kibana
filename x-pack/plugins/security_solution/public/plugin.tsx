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
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import { initTelemetry } from './common/lib/telemetry';
import { KibanaServices } from './common/lib/kibana/services';
import { serviceNowActionType, jiraActionType } from './common/lib/connectors';
import { PluginSetup, PluginStart, SetupPlugins, StartPlugins, StartServices } from './types';
import { APP_ID, APP_ICON, APP_PATH, APP_ALERT_PATH } from '../common/constants';
import { ConfigureEndpointDatasource } from './management/pages/policy/view/ingest_manager_integration/configure_datasource';

import { State, createStore, createInitialState } from './common/store';

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
      path: APP_PATH,
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    });

    plugins.triggers_actions_ui.actionTypeRegistry.register(serviceNowActionType());
    plugins.triggers_actions_ui.actionTypeRegistry.register(jiraActionType());

    const mountSecurityFactory = async () => {
      const [coreStart, startPlugins] = await core.getStartServices();
      if (this.store == null) {
        await this.buildStore(coreStart, startPlugins);
      }

      const services = {
        ...coreStart,
        ...startPlugins,
        security: plugins.security,
      } as StartServices;
      return { coreStart, startPlugins, services, store: this.store };
    };

    core.application.register({
      id: `${APP_ID}:overview`,
      title: i18n.translate('xpack.securitySolution.overviewPage.title', {
        defaultMessage: 'Overview',
      }),
      order: 9000,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: `${APP_PATH}/overview`,
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
      id: `${APP_ID}:alerts`,
      title: i18n.translate('xpack.securitySolution.alertsPage.title', {
        defaultMessage: 'Alerts',
      }),
      order: 9001,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_ALERT_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services },
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
          SubPluginRoutes: alertsSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:hosts`,
      title: 'Hosts',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: `${APP_PATH}/hosts`,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services },
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
          SubPluginRoutes: hostsSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:network`,
      title: 'Network',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: `${APP_PATH}/network`,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services },
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
          SubPluginRoutes: networkSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:timelines`,
      title: 'Timelines',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: `${APP_PATH}/timelines`,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services },
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
          SubPluginRoutes: networkSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:cases`,
      title: 'Cases',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: `${APP_PATH}/cases`,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services },
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
          SubPluginRoutes: networkSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:management`,
      title: 'Management',
      order: 9002,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: `${APP_PATH}/management`,
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
    const [
      AlertsSubPlugin,
      CasesSubPlugin,
      HostsSubPlugin,
      NetworkSubPlugin,
      OverviewSubPlugin,
      TimelinesSubPlugin,
      EndpointAlertsSubPlugin,
      EndpointHostsSubPlugin,
      ManagementSubPlugin,
    ] = await Promise.all([
      import('./alerts'),
      import('./cases'),
      import('./hosts'),
      import('./network'),
      import('./overview'),
      import('./timelines'),
      import('./endpoint_alerts'),
      import('./endpoint_hosts'),
      import('./management'),
    ]);

    return {
      alertsSubPlugin: new AlertsSubPlugin.Alerts(),
      casesSubPlugin: new CasesSubPlugin.Cases(),
      hostsSubPlugin: new HostsSubPlugin.Hosts(),
      networkSubPlugin: new NetworkSubPlugin.Network(),
      overviewSubPlugin: new OverviewSubPlugin.Overview(),
      timelinesSubPlugin: new TimelinesSubPlugin.Timelines(),
      endpointAlertsSubPlugin: new EndpointAlertsSubPlugin.EndpointAlerts(),
      endpointHostsSubPlugin: new EndpointHostsSubPlugin.EndpointHosts(),
      managementSubPlugin: new ManagementSubPlugin.Management(),
    };
  }

  private async buildStore(coreStart: CoreStart, startPlugins: StartPlugins) {
    const { composeLibs } = await this.downloadAssets();

    const {
      hostsSubPlugin,
      networkSubPlugin,
      timelinesSubPlugin,
      endpointAlertsSubPlugin,
      endpointHostsSubPlugin,
      managementSubPlugin,
    } = await this.downloadSubPlugins();

    const libs$ = new BehaviorSubject(composeLibs(coreStart));

    const hostsStart = hostsSubPlugin.start();
    const networkStart = networkSubPlugin.start();
    const timelinesStart = timelinesSubPlugin.start();
    const endpointAlertsStart = endpointAlertsSubPlugin.start(coreStart, startPlugins);
    const endpointHostsStart = endpointHostsSubPlugin.start(coreStart, startPlugins);
    const managementSubPluginStart = managementSubPlugin.start(coreStart, startPlugins);

    this.store = createStore(
      createInitialState({
        ...hostsStart.store.initialState,
        ...networkStart.store.initialState,
        ...timelinesStart.store.initialState,
        ...endpointAlertsStart.store.initialState,
        ...endpointHostsStart.store.initialState,
        ...managementSubPluginStart.store.initialState,
      }),
      {
        ...hostsStart.store.reducer,
        ...networkStart.store.reducer,
        ...timelinesStart.store.reducer,
        ...endpointAlertsStart.store.reducer,
        ...endpointHostsStart.store.reducer,
        ...managementSubPluginStart.store.reducer,
      },
      libs$.pipe(pluck('apolloClient')),
      [
        ...(endpointAlertsStart.store.middleware ?? []),
        ...(endpointHostsStart.store.middleware ?? []),
        ...(managementSubPluginStart.store.middleware ?? []),
      ]
    );
  }
}
