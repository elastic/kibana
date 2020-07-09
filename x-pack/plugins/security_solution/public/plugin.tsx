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
  AppNavLinkStatus,
} from '../../../../src/core/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import { initTelemetry } from './common/lib/telemetry';
import { KibanaServices } from './common/lib/kibana/services';
import { jiraActionType } from './common/lib/connectors';
import {
  PluginSetup,
  PluginStart,
  SetupPlugins,
  StartPlugins,
  StartServices,
  AppObservableLibs,
} from './types';
import {
  APP_ID,
  APP_ICON,
  APP_DETECTIONS_PATH,
  APP_HOSTS_PATH,
  APP_OVERVIEW_PATH,
  APP_NETWORK_PATH,
  APP_TIMELINES_PATH,
  APP_MANAGEMENT_PATH,
  APP_CASES_PATH,
  APP_PATH,
} from '../common/constants';
import { ConfigureEndpointPackageConfig } from './management/pages/policy/view/ingest_manager_integration/configure_package_config';

import { State, createStore, createInitialState } from './common/store';
import { SecurityPageName } from './app/types';
import { manageOldSiemRoutes } from './helpers';
import {
  OVERVIEW,
  HOSTS,
  NETWORK,
  TIMELINES,
  DETECTION_ENGINE,
  CASE,
  ADMINISTRATION,
} from './app/home/translations';

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

    core.application.register({
      exactRoute: true,
      id: APP_ID,
      title: i18n.translate('xpack.securitySolution.security.title', {
        defaultMessage: 'Security',
      }),
      appRoute: APP_PATH,
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async () => {
        const [{ application }] = await core.getStartServices();
        application.navigateToApp(`${APP_ID}:${SecurityPageName.overview}`, { replace: true });
        return () => true;
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.overview}`,
      title: OVERVIEW,
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
      id: `${APP_ID}:${SecurityPageName.detections}`,
      title: DETECTION_ENGINE,
      order: 9001,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_DETECTIONS_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, services, storage },
          { renderApp, composeLibs },
          { detectionsSubPlugin },
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
          SubPluginRoutes: detectionsSubPlugin.start(storage).SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.hosts}`,
      title: HOSTS,
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
      title: NETWORK,
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
      title: TIMELINES,
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
      title: CASE,
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
      title: ADMINISTRATION,
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
    plugins.ingestManager.registerPackageConfigComponent(
      'endpoint',
      ConfigureEndpointPackageConfig
    );

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
      detectionsSubPlugin,
      casesSubPlugin,
      hostsSubPlugin,
      networkSubPlugin,
      overviewSubPlugin,
      timelinesSubPlugin,
      managementSubPlugin,
    } = await import('./sub_plugins');

    return {
      detectionsSubPlugin,
      casesSubPlugin,
      hostsSubPlugin,
      networkSubPlugin,
      overviewSubPlugin,
      timelinesSubPlugin,
      managementSubPlugin,
    };
  }

  private async buildStore(coreStart: CoreStart, startPlugins: StartPlugins, storage: Storage) {
    const { composeLibs } = await this.downloadAssets();

    const {
      detectionsSubPlugin,
      hostsSubPlugin,
      networkSubPlugin,
      timelinesSubPlugin,
      managementSubPlugin,
    } = await this.downloadSubPlugins();
    const { apolloClient } = composeLibs(coreStart);
    const appLibs: AppObservableLibs = { apolloClient, kibana: coreStart };
    const libs$ = new BehaviorSubject(appLibs);

    const detectionsStart = detectionsSubPlugin.start(storage);
    const hostsStart = hostsSubPlugin.start(storage);
    const networkStart = networkSubPlugin.start(storage);
    const timelinesStart = timelinesSubPlugin.start();
    const managementSubPluginStart = managementSubPlugin.start(coreStart, startPlugins);

    const timelineInitialState = {
      timeline: {
        ...timelinesStart.store.initialState.timeline!,
        timelineById: {
          ...timelinesStart.store.initialState.timeline!.timelineById,
          ...detectionsStart.storageTimelines!.timelineById,
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
        ...managementSubPluginStart.store.initialState,
      }),
      {
        ...hostsStart.store.reducer,
        ...networkStart.store.reducer,
        ...timelinesStart.store.reducer,
        ...managementSubPluginStart.store.reducer,
      },
      libs$.pipe(pluck('apolloClient')),
      libs$.pipe(pluck('kibana')),
      storage,
      [...(managementSubPluginStart.store.middleware ?? [])]
    );
  }
}
