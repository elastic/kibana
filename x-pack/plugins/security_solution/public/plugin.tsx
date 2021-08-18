/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import reduceReducers from 'reduce-reducers';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { AnyAction, Reducer } from 'redux';
import {
  PluginSetup,
  PluginStart,
  SetupPlugins,
  StartPlugins,
  StartServices,
  AppObservableLibs,
  SubPlugins,
  StartedSubPlugins,
} from './types';
import {
  AppMountParameters,
  AppUpdater,
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
import { BASE_RAC_ALERTS_API_PATH } from '../../rule_registry/common/constants';

import {
  APP_ID,
  OVERVIEW_PATH,
  APP_OVERVIEW_PATH,
  APP_PATH,
  DEFAULT_INDEX_KEY,
  APP_ICON_SOLUTION,
  SERVER_APP_ID,
} from '../common/constants';

import { getDeepLinks, updateGlobalNavigation } from './app/deep_links';
import { manageOldSiemRoutes } from './helpers';
import {
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '../common/search_strategy/index_fields';
import { SecurityAppStore } from './common/store/store';
import { licenseService } from './common/hooks/use_license';
import { SecuritySolutionUiConfigType } from './common/types';

import { getLazyEndpointPolicyEditExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_edit_extension';
import { LazyEndpointPolicyCreateExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_create_extension';
import { getLazyEndpointPackageCustomExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_package_custom_extension';
import {
  ExperimentalFeatures,
  parseExperimentalConfigValue,
} from '../common/experimental_features';
import type { TimelineState } from '../../timelines/public';
import { LazyEndpointCustomAssetsExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_custom_assets_extension';

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  readonly kibanaVersion: string;
  private config: SecuritySolutionUiConfigType;
  readonly experimentalFeatures: ExperimentalFeatures;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<SecuritySolutionUiConfigType>();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }
  private appUpdater$ = new Subject<AppUpdater>();

  private storage = new Storage(localStorage);
  private licensingSubscription: Subscription | null = null;

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
        description: i18n.translate('xpack.securitySolution.featureCatalogueDescription', {
          defaultMessage:
            'Prevent, collect, detect, and respond to threats for unified protection across your infrastructure.',
        }),
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
      id: APP_ID,
      title: APP_NAME,
      appRoute: APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      navLinkStatus: AppNavLinkStatus.hidden,
      searchable: true,
      defaultPath: OVERVIEW_PATH,
      updater$: this.appUpdater$,
      euiIconType: APP_ICON_SOLUTION,
      deepLinks: getDeepLinks(this.experimentalFeatures),
      mount: async (params: AppMountParameters) => {
        const [coreStart, startPlugins] = await core.getStartServices();
        const subPlugins = await this.startSubPlugins(this.storage, coreStart, startPlugins);
        const { renderApp } = await this.lazyApplicationDependencies();
        return renderApp({
          ...params,
          services: await startServices,
          store: await this.store(coreStart, startPlugins, subPlugins),
          usageCollection: plugins.usageCollection,
          subPlugins,
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
    if (plugins.fleet) {
      const { registerExtension } = plugins.fleet;

      registerExtension({
        package: 'endpoint',
        view: 'package-policy-edit',
        Component: getLazyEndpointPolicyEditExtension(core, plugins),
      });

      registerExtension({
        package: 'endpoint',
        view: 'package-policy-create',
        Component: LazyEndpointPolicyCreateExtension,
      });

      registerExtension({
        package: 'endpoint',
        view: 'package-detail-custom',
        Component: getLazyEndpointPackageCustomExtension(core, plugins),
      });

      registerExtension({
        package: 'endpoint',
        view: 'package-detail-assets',
        Component: LazyEndpointCustomAssetsExtension,
      });
    }
    licenseService.start(plugins.licensing.license$);
    const licensing = licenseService.getLicenseInformation$();
    /**
     * Register deepLinks and pass an appUpdater for each subPlugin, to change deepLinks as needed when licensing changes.
     */
    if (licensing !== null) {
      this.licensingSubscription = licensing.subscribe((currentLicense) => {
        if (currentLicense.type !== undefined) {
          this.appUpdater$.next(() => ({
            navLinkStatus: AppNavLinkStatus.hidden, // workaround to prevent main navLink to switch to visible after update. should not be needed
            deepLinks: getDeepLinks(
              this.experimentalFeatures,
              currentLicense.type,
              core.application.capabilities
            ),
          }));
        }
      });
    } else {
      updateGlobalNavigation({
        capabilities: core.application.capabilities,
        updater$: this.appUpdater$,
        enableExperimental: this.experimentalFeatures,
      });
    }

    return {};
  }

  public stop() {
    if (this.licensingSubscription !== null) {
      this.licensingSubscription.unsubscribe();
    }
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
        alerts: new subPluginClasses.Detections(),
        rules: new subPluginClasses.Rules(),
        exceptions: new subPluginClasses.Exceptions(),
        cases: new subPluginClasses.Cases(),
        hosts: new subPluginClasses.Hosts(),
        network: new subPluginClasses.Network(),
        ...(this.experimentalFeatures.uebaEnabled ? { ueba: new subPluginClasses.Ueba() } : {}),
        overview: new subPluginClasses.Overview(),
        timelines: new subPluginClasses.Timelines(),
        management: new subPluginClasses.Management(),
      };
    }
    return this._subPlugins;
  }

  /**
   * All started subPlugins.
   */
  private async startSubPlugins(
    storage: Storage,
    core: CoreStart,
    plugins: StartPlugins
  ): Promise<StartedSubPlugins> {
    const subPlugins = await this.subPlugins();
    return {
      overview: subPlugins.overview.start(),
      alerts: subPlugins.alerts.start(storage),
      rules: subPlugins.rules.start(storage),
      exceptions: subPlugins.exceptions.start(storage),
      cases: subPlugins.cases.start(),
      hosts: subPlugins.hosts.start(storage),
      network: subPlugins.network.start(storage),
      ...(this.experimentalFeatures.uebaEnabled && subPlugins.ueba != null
        ? { ueba: subPlugins.ueba.start(storage) }
        : {}),
      timelines: subPlugins.timelines.start(),
      management: subPlugins.management.start(core, plugins),
    };
  }

  /**
   * Lazily instantiate a `SecurityAppStore`. We lazily instantiate this because it requests large dynamic imports. We instantiate it once because each subPlugin needs to share the same reference.
   */
  private async store(
    coreStart: CoreStart,
    startPlugins: StartPlugins,
    subPlugins: StartedSubPlugins
  ): Promise<SecurityAppStore> {
    if (!this._store) {
      const defaultIndicesName = coreStart.uiSettings.get(DEFAULT_INDEX_KEY);
      const [
        { createStore, createInitialState },
        kibanaIndexPatterns,
        configIndexPatterns,
      ] = await Promise.all([
        this.lazyApplicationDependencies(),
        startPlugins.data.indexPatterns.getIdsWithTitle(),
        startPlugins.data.search
          .search<IndexFieldsStrategyRequest, IndexFieldsStrategyResponse>(
            { indices: defaultIndicesName, onlyCheckIfIndicesExist: true },
            {
              strategy: 'indexFields',
            }
          )
          .toPromise(),
      ]);

      let signal: { name: string | null } = { name: null };
      try {
        const { index_name: indexName } = await coreStart.http.fetch(
          `${BASE_RAC_ALERTS_API_PATH}/index`,
          {
            method: 'GET',
            query: { features: SERVER_APP_ID },
          }
        );
        signal = { name: indexName[0] };
      } catch {
        signal = { name: null };
      }

      const appLibs: AppObservableLibs = { kibana: coreStart };
      const libs$ = new BehaviorSubject(appLibs);

      const timelineInitialState = {
        timeline: {
          ...subPlugins.timelines.store.initialState.timeline!,
          timelineById: {
            ...subPlugins.timelines.store.initialState.timeline!.timelineById,
            ...subPlugins.alerts.storageTimelines!.timelineById,
            ...subPlugins.rules.storageTimelines!.timelineById,
            ...subPlugins.exceptions.storageTimelines!.timelineById,
            ...subPlugins.hosts.storageTimelines!.timelineById,
            ...subPlugins.network.storageTimelines!.timelineById,
            ...(this.experimentalFeatures.uebaEnabled && subPlugins.ueba != null
              ? subPlugins.ueba.storageTimelines!.timelineById
              : {}),
          },
        },
      };

      const tGridReducer = startPlugins.timelines?.getTGridReducer() ?? {};
      const timelineReducer = (reduceReducers(
        timelineInitialState.timeline,
        tGridReducer,
        subPlugins.timelines.store.reducer.timeline
      ) as unknown) as Reducer<TimelineState, AnyAction>;

      this._store = createStore(
        createInitialState(
          {
            ...subPlugins.hosts.store.initialState,
            ...subPlugins.network.store.initialState,
            ...(this.experimentalFeatures.uebaEnabled && subPlugins.ueba != null
              ? subPlugins.ueba.store.initialState
              : {}),
            ...timelineInitialState,
            ...subPlugins.management.store.initialState,
          },
          {
            kibanaIndexPatterns,
            configIndexPatterns: configIndexPatterns.indicesExist,
            signalIndexName: signal.name,
            enableExperimental: this.experimentalFeatures,
          }
        ),
        {
          ...subPlugins.hosts.store.reducer,
          ...subPlugins.network.store.reducer,
          ...(this.experimentalFeatures.uebaEnabled && subPlugins.ueba != null
            ? subPlugins.ueba.store.reducer
            : {}),
          timeline: timelineReducer,
          ...subPlugins.management.store.reducer,
          ...tGridReducer,
        },
        libs$.pipe(pluck('kibana')),
        this.storage,
        [...(subPlugins.management.store.middleware ?? [])]
      );
      if (startPlugins.timelines) {
        startPlugins.timelines.setTGridEmbeddedStore(this._store);
      }
    }
    return this._store;
  }
}

const APP_NAME = i18n.translate('xpack.securitySolution.security.title', {
  defaultMessage: 'Security',
});
