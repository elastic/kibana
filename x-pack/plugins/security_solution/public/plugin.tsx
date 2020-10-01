/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Store, Action } from 'redux';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { Detections } from './detections';
import { Cases } from './cases';
import { Hosts } from './hosts';
import { Network } from './network';
import { Overview } from './overview';
import { Timelines } from './timelines';
import { Management } from './management';

import {
  LazyApplicationDependencies,
  PluginSetup,
  PluginStart,
  SetupPlugins,
  StartPlugins,
  StartServices,
  AppObservableLibs,
} from './types';
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
import { initTelemetry } from './common/lib/telemetry';
import { KibanaServices } from './common/lib/kibana/services';

import {
  APP_ID,
  APP_ICON_SOLUTION,
  APP_DETECTIONS_PATH,
  APP_HOSTS_PATH,
  APP_OVERVIEW_PATH,
  APP_NETWORK_PATH,
  APP_TIMELINES_PATH,
  APP_MANAGEMENT_PATH,
  APP_CASES_PATH,
  APP_PATH,
  DEFAULT_INDEX_KEY,
} from '../common/constants';

import { ConfigureEndpointPackagePolicy } from './management/pages/policy/view/ingest_manager_integration/configure_package_policy';

import { State } from './common/store';
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
import {
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '../common/search_strategy/index_fields';

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private kibanaVersion: string;
  private store!: Store<State, Action>;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  /**
   * The dependencies needed to mount the applications. These are dynamically loaded for the sake of webpack bundling efficiency.
   */
  private get lazyApplicationDependencies(): Promise<LazyApplicationDependencies> {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    /* webpackChunkName: "lazyApplicationDependencies" */ './lazy_application_dependencies';
    return import('./lazy_application_dependencies');
  }

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    initTelemetry(plugins.usageCollection, APP_ID);

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        id: APP_ID,
        title: APP_NAME,
        subtitle: i18n.translate('xpack.securitySolution.featureCatalogue.subtitle', {
          defaultMessage: 'SIEM & Endpoint Security',
        }),
        descriptions: [
          i18n.translate('xpack.securitySolution.featureCatalogueDescription1', {
            defaultMessage: 'Prevent threats autonomously.',
          }),
          i18n.translate('xpack.securitySolution.featureCatalogueDescription2', {
            defaultMessage: 'Detect and respond.',
          }),
          i18n.translate('xpack.securitySolution.featureCatalogueDescription3', {
            defaultMessage: 'Investigate incidents.',
          }),
        ],
        icon: 'logoSecurity',
        path: APP_OVERVIEW_PATH,
        order: 300,
      });
    }

    const startServices: Promise<StartServices> = (async () => {
      const storage = new Storage(localStorage);
      const [coreStart, startPlugins] = await core.getStartServices();

      const services: StartServices = {
        ...coreStart,
        ...startPlugins,
        storage,
        security: plugins.security,
      };
      return services;
    })();

    /**
     * Lazily get the dependencies needed to mount any of the applications defined in this plugin.
     * This is done lazily so that we can dynamically import code only when the applications are being mounted.
     */
    const applicationMountDependencies = async () => {
      const storage = new Storage(localStorage);
      const [coreStart, startPlugins] = await core.getStartServices();
      if (this.store == null) {
        await this.buildStore(coreStart, startPlugins, storage);
      }

      return {
        coreStart,
        startPlugins,
        store: this.store,
        storage,
        ...(await this.lazyApplicationDependencies),
      };
    };

    core.application.register({
      exactRoute: true,
      id: APP_ID,
      title: APP_NAME,
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
      euiIconType: APP_ICON_SOLUTION,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_OVERVIEW_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, renderApp, composeLibs },
          { overview: overviewSubPlugin },
        ] = await Promise.all([applicationMountDependencies(), this.subPlugins()]);

        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store,
          SubPluginRoutes: overviewSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.detections}`,
      title: DETECTION_ENGINE,
      order: 9001,
      euiIconType: APP_ICON_SOLUTION,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_DETECTIONS_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, storage, renderApp, composeLibs },
          { detections: detectionsSubPlugin },
        ] = await Promise.all([applicationMountDependencies(), this.subPlugins()]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store,
          SubPluginRoutes: detectionsSubPlugin.start(storage).SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.hosts}`,
      title: HOSTS,
      order: 9002,
      euiIconType: APP_ICON_SOLUTION,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_HOSTS_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, storage, renderApp, composeLibs },
          { hosts: hostsSubPlugin },
        ] = await Promise.all([applicationMountDependencies(), this.subPlugins()]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store,
          SubPluginRoutes: hostsSubPlugin.start(storage).SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.network}`,
      title: NETWORK,
      order: 9002,
      euiIconType: APP_ICON_SOLUTION,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_NETWORK_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, storage, renderApp, composeLibs },
          { network: networkSubPlugin },
        ] = await Promise.all([applicationMountDependencies(), this.subPlugins()]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store,
          SubPluginRoutes: networkSubPlugin.start(storage).SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.timelines}`,
      title: TIMELINES,
      order: 9002,
      euiIconType: APP_ICON_SOLUTION,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_TIMELINES_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, renderApp, composeLibs },
          { timelines: timelinesSubPlugin },
        ] = await Promise.all([applicationMountDependencies(), this.subPlugins()]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store,
          SubPluginRoutes: timelinesSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.case}`,
      title: CASE,
      order: 9002,
      euiIconType: APP_ICON_SOLUTION,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_CASES_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, store, renderApp, composeLibs },
          { cases: casesSubPlugin },
        ] = await Promise.all([applicationMountDependencies(), this.subPlugins()]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store,
          SubPluginRoutes: casesSubPlugin.start().SubPluginRoutes,
        });
      },
    });

    core.application.register({
      id: `${APP_ID}:${SecurityPageName.administration}`,
      title: ADMINISTRATION,
      order: 9002,
      euiIconType: APP_ICON_SOLUTION,
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: APP_MANAGEMENT_PATH,
      mount: async (params: AppMountParameters) => {
        const [
          { coreStart, startPlugins, store, renderApp, composeLibs },
          { management: managementSubPlugin },
        ] = await Promise.all([applicationMountDependencies(), this.subPlugins()]);
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
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

    return {
      resolver: async () => {
        /**
         * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
         * See https://webpack.js.org/api/module-methods/#magic-comments
         */
        const { resolverPluginSetup } = await import(
          /* webpackChunkName: "resolver" */ './resolver'
        );
        return resolverPluginSetup();
      },
    };
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    KibanaServices.init({ ...core, ...plugins, kibanaVersion: this.kibanaVersion });
    if (plugins.ingestManager) {
      plugins.ingestManager.registerPackagePolicyComponent(
        'endpoint',
        ConfigureEndpointPackagePolicy
      );
    }

    return {};
  }

  public stop() {
    return {};
  }

  /**
   * Lazily instantiated subPlugins. see `subPlugins`.
   */
  private _subPlugins?: SubPlugins;

  /**
   * Lazily instantiated subPlugins.
   */
  private async subPlugins(): Promise<SubPlugins> {
    if (!this._subPlugins) {
      const { subPluginClasses } = await this.lazyApplicationDependencies;
      this._subPlugins = {
        detections: new subPluginClasses.Detections(),
        cases: new subPluginClasses.Cases(),
        hosts: new subPluginClasses.Hosts(),
        network: new subPluginClasses.Network(),
        overview: new subPluginClasses.Overview(),
        timelines: new subPluginClasses.Timelines(),
        management: new subPluginClasses.Management(),
      };
    }
    return this._subPlugins;
  }

  private async buildStore(coreStart: CoreStart, startPlugins: StartPlugins, storage: Storage) {
    const defaultIndicesName = coreStart.uiSettings.get(DEFAULT_INDEX_KEY);
    const [
      { composeLibs },
      kibanaIndexPatterns,
      {
        detections: detectionsSubPlugin,
        hosts: hostsSubPlugin,
        network: networkSubPlugin,
        timelines: timelinesSubPlugin,
        management: managementSubPlugin,
      },
      configIndexPatterns,
      { createStore, createInitialState },
    ] = await Promise.all([
      this.lazyApplicationDependencies,
      startPlugins.data.indexPatterns.getIdsWithTitle(),
      this.subPlugins(),
      startPlugins.data.search
        .search<IndexFieldsStrategyRequest, IndexFieldsStrategyResponse>(
          { indices: defaultIndicesName, onlyCheckIfIndicesExist: false },
          {
            strategy: 'securitySolutionIndexFields',
          }
        )
        .toPromise(),

      this.lazyApplicationDependencies,
    ]);

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
      createInitialState(
        {
          ...hostsStart.store.initialState,
          ...networkStart.store.initialState,
          ...timelineInitialState,
          ...managementSubPluginStart.store.initialState,
        },
        {
          kibanaIndexPatterns,
          configIndexPatterns: configIndexPatterns.indicesExist,
        }
      ),
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

const APP_NAME = i18n.translate('xpack.securitySolution.security.title', {
  defaultMessage: 'Security',
});

interface SubPlugins {
  detections: Detections;
  cases: Cases;
  hosts: Hosts;
  network: Network;
  overview: Overview;
  timelines: Timelines;
  management: Management;
}
