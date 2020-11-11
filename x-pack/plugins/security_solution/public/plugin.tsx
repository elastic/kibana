/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';

import {
  PluginSetup,
  PluginStart,
  SetupPlugins,
  StartPlugins,
  StartServices,
  AppObservableLibs,
  SubPlugins,
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
import { SecurityAppStore } from './common/store/store';
import { getCaseConnectorUI } from './common/lib/connectors';

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  private storage = new Storage(localStorage);

  /**
   * Lazily instantiated subPlugins.
   * See `subPlugins` method.
   */
  private _subPlugins?: SubPlugins;

  /**
   * Lazily instantiated `SecurityAppStore`.
   * See `store` method.
   */
  private _store?: SecurityAppStore;

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    initTelemetry(
      {
        usageCollection: plugins.usageCollection,
        telemetryManagementSection: plugins.telemetryManagementSection,
      },
      APP_ID
    );

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        id: APP_ID,
        title: APP_NAME,
        subtitle: i18n.translate('xpack.securitySolution.featureCatalogue.subtitle', {
          defaultMessage: 'SIEM & Endpoint Security',
        }),
        description: i18n.translate('xpack.securitySolution.featureCatalogueDescription', {
          defaultMessage:
            'Prevent, collect, detect, and respond to threats for unified protection across your infrastructure.',
        }),
        appDescriptions: [
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

    /**
     * `StartServices` which are needed by the `renderApp` function when mounting any of the subPlugin applications.
     * This is a promise because these aren't available until the `start` lifecycle phase but they are referenced
     * in the `setup` lifecycle phase.
     */
    const startServices: Promise<StartServices> = (async () => {
      const [coreStart, startPlugins] = await core.getStartServices();

      const services: StartServices = {
        ...coreStart,
        ...startPlugins,
        storage: this.storage,
        security: plugins.security,
      };
      return services;
    })();

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
        const [coreStart, startPlugins] = await core.getStartServices();
        const { overview: subPlugin } = await this.subPlugins();
        const { renderApp, composeLibs } = await this.lazyApplicationDependencies();

        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store: await this.store(coreStart, startPlugins),
          SubPluginRoutes: subPlugin.start().SubPluginRoutes,
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
        const [coreStart, startPlugins] = await core.getStartServices();
        const { detections: subPlugin } = await this.subPlugins();
        const { renderApp, composeLibs } = await this.lazyApplicationDependencies();

        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store: await this.store(coreStart, startPlugins),
          SubPluginRoutes: subPlugin.start(this.storage).SubPluginRoutes,
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
        const [coreStart, startPlugins] = await core.getStartServices();
        const { hosts: subPlugin } = await this.subPlugins();
        const { renderApp, composeLibs } = await this.lazyApplicationDependencies();
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store: await this.store(coreStart, startPlugins),
          SubPluginRoutes: subPlugin.start(this.storage).SubPluginRoutes,
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
        const [coreStart, startPlugins] = await core.getStartServices();
        const { network: subPlugin } = await this.subPlugins();
        const { renderApp, composeLibs } = await this.lazyApplicationDependencies();
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store: await this.store(coreStart, startPlugins),
          SubPluginRoutes: subPlugin.start(this.storage).SubPluginRoutes,
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
        const [coreStart, startPlugins] = await core.getStartServices();
        const { timelines: subPlugin } = await this.subPlugins();
        const { renderApp, composeLibs } = await this.lazyApplicationDependencies();
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store: await this.store(coreStart, startPlugins),
          SubPluginRoutes: subPlugin.start().SubPluginRoutes,
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
        const [coreStart, startPlugins] = await core.getStartServices();
        const { cases: subPlugin } = await this.subPlugins();
        const { renderApp, composeLibs } = await this.lazyApplicationDependencies();
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store: await this.store(coreStart, startPlugins),
          SubPluginRoutes: subPlugin.start().SubPluginRoutes,
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
        const [coreStart, startPlugins] = await core.getStartServices();
        const { management: managementSubPlugin } = await this.subPlugins();
        const { renderApp, composeLibs } = await this.lazyApplicationDependencies();
        return renderApp({
          ...composeLibs(coreStart),
          ...params,
          services: await startServices,
          store: await this.store(coreStart, startPlugins),
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

    plugins.triggersActionsUi.actionTypeRegistry.register(getCaseConnectorUI());

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
    if (plugins.fleet) {
      plugins.fleet.registerPackagePolicyComponent('endpoint', ConfigureEndpointPackagePolicy);
    }

    return {};
  }

  public stop() {
    return {};
  }

  /**
   * The dependencies needed to mount the applications. These are dynamically loaded for the sake of webpack bundling efficiency.
   * Webpack is smart enough to only request (and download) this even when it is imported multiple times concurrently.
   */
  private lazyApplicationDependencies() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_application_dependencies" */
      './lazy_application_dependencies'
    );
  }

  /**
   * The dependencies needed to mount the applications. These are dynamically loaded for the sake of webpack bundling efficiency.
   * Webpack is smart enough to only request (and download) this even when it is imported multiple times concurrently.
   */
  private lazySubPlugins() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_sub_plugins" */
      './lazy_sub_plugins'
    );
  }

  /**
   * Lazily instantiated subPlugins. This should be instantiated just once.
   */
  private async subPlugins(): Promise<SubPlugins> {
    if (!this._subPlugins) {
      const { subPluginClasses } = await this.lazySubPlugins();
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

  /**
   * Lazily instantiate a `SecurityAppStore`. We lazily instantiate this because it requests large dynamic imports. We instantiate it once because each subPlugin needs to share the same reference.
   */
  private async store(coreStart: CoreStart, startPlugins: StartPlugins): Promise<SecurityAppStore> {
    if (!this._store) {
      const defaultIndicesName = coreStart.uiSettings.get(DEFAULT_INDEX_KEY);
      const [
        { composeLibs, createStore, createInitialState },
        kibanaIndexPatterns,
        {
          detections: detectionsSubPlugin,
          hosts: hostsSubPlugin,
          network: networkSubPlugin,
          timelines: timelinesSubPlugin,
          management: managementSubPlugin,
        },
        configIndexPatterns,
      ] = await Promise.all([
        this.lazyApplicationDependencies(),
        startPlugins.data.indexPatterns.getIdsWithTitle(),
        this.subPlugins(),
        startPlugins.data.search
          .search<IndexFieldsStrategyRequest, IndexFieldsStrategyResponse>(
            { indices: defaultIndicesName, onlyCheckIfIndicesExist: true },
            {
              strategy: 'securitySolutionIndexFields',
            }
          )
          .toPromise(),
      ]);

      const { apolloClient } = composeLibs(coreStart);
      const appLibs: AppObservableLibs = { apolloClient, kibana: coreStart };
      const libs$ = new BehaviorSubject(appLibs);

      const detectionsStart = detectionsSubPlugin.start(this.storage);
      const hostsStart = hostsSubPlugin.start(this.storage);
      const networkStart = networkSubPlugin.start(this.storage);
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

      this._store = createStore(
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
        this.storage,
        [...(managementSubPluginStart.store.middleware ?? [])]
      );
    }
    return this._store;
  }
}

const APP_NAME = i18n.translate('xpack.securitySolution.security.title', {
  defaultMessage: 'Security',
});
