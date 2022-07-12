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
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Plugin as IPlugin,
  DEFAULT_APP_CATEGORIES,
  AppNavLinkStatus,
} from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { TimelineState } from '@kbn/timelines-plugin/public';
import type {
  PluginSetup,
  PluginStart,
  SetupPlugins,
  StartPlugins,
  StartServices,
  AppObservableLibs,
  SubPlugins,
  StartedSubPlugins,
} from './types';
import { initTelemetry } from './common/lib/telemetry';
import { KibanaServices } from './common/lib/kibana/services';
import { SOLUTION_NAME } from './common/translations';

import {
  APP_ID,
  APP_UI_ID,
  APP_PATH,
  DEFAULT_INDEX_KEY,
  APP_ICON_SOLUTION,
  DETECTION_ENGINE_INDEX_URL,
  SERVER_APP_ID,
  SOURCERER_API_URL,
  ENABLE_GROUPED_NAVIGATION,
} from '../common/constants';

import { getDeepLinks, registerDeepLinksUpdater } from './app/deep_links';
import { AppLinkItems, LinksPermissions, subscribeAppLinks, updateAppLinks } from './common/links';
import { getSubPluginRoutesByCapabilities, manageOldSiemRoutes } from './helpers';
import { SecurityAppStore } from './common/store/store';
import { licenseService } from './common/hooks/use_license';
import { SecuritySolutionUiConfigType } from './common/types';
import { ExperimentalFeaturesService } from './common/experimental_features_service';

import { getLazyEndpointPolicyEditExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_edit_extension';
import { LazyEndpointPolicyCreateExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_create_extension';
import { getLazyEndpointPackageCustomExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_package_custom_extension';
import { getLazyEndpointPolicyResponseExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_response_extension';
import {
  ExperimentalFeatures,
  parseExperimentalConfigValue,
} from '../common/experimental_features';
import { LazyEndpointCustomAssetsExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_custom_assets_extension';
import { initDataView, SourcererModel, KibanaDataView } from './common/store/sourcerer/model';
import { SecurityDataView } from './common/containers/sourcerer/api';

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
      },
      APP_UI_ID
    );

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        id: APP_ID,
        title: SOLUTION_NAME,
        description: i18n.translate('xpack.securitySolution.featureCatalogueDescription', {
          defaultMessage:
            'Prevent, collect, detect, and respond to threats for unified protection across your infrastructure.',
        }),
        icon: 'logoSecurity',
        path: APP_PATH,
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
      const { apm } = await import('@elastic/apm-rum');

      const services: StartServices = {
        ...coreStart,
        ...startPlugins,
        apm,
        storage: this.storage,
        security: plugins.security,
      };
      return services;
    })();

    core.application.register({
      id: APP_UI_ID,
      title: SOLUTION_NAME,
      appRoute: APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      navLinkStatus: AppNavLinkStatus.hidden,
      searchable: true,
      updater$: this.appUpdater$,
      euiIconType: APP_ICON_SOLUTION,
      mount: async (params: AppMountParameters) => {
        // required to show the alert table inside cases
        const { alertsTableConfigurationRegistry } = plugins.triggersActionsUi;
        const { registerAlertsTableConfiguration } =
          await this.lazyRegisterAlertsTableConfiguration();
        registerAlertsTableConfiguration(alertsTableConfigurationRegistry, this.storage);

        const [coreStart, startPlugins] = await core.getStartServices();
        const subPlugins = await this.startSubPlugins(this.storage, coreStart, startPlugins);
        const { renderApp } = await this.lazyApplicationDependencies();
        return renderApp({
          ...params,
          services: await startServices,
          store: await this.store(coreStart, startPlugins, subPlugins),
          usageCollection: plugins.usageCollection,
          subPluginRoutes: getSubPluginRoutesByCapabilities(
            subPlugins,
            coreStart.application.capabilities
          ),
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

        const subscription = subscribeAppLinks((links: AppLinkItems) => {
          // It has to be called once after deep links are initialized
          if (links.length > 0) {
            manageOldSiemRoutes(coreStart);
            subscription.unsubscribe();
          }
        });

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
    ExperimentalFeaturesService.init({ experimentalFeatures: this.experimentalFeatures });
    if (plugins.fleet) {
      const { registerExtension } = plugins.fleet;

      registerExtension({
        package: 'endpoint',
        view: 'package-policy-edit',
        Component: getLazyEndpointPolicyEditExtension(core, plugins),
      });

      if (this.experimentalFeatures.policyResponseInFleetEnabled) {
        registerExtension({
          package: 'endpoint',
          view: 'package-policy-response',
          Component: getLazyEndpointPolicyResponseExtension(core, plugins),
        });
      }

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

    // Not using await to prevent blocking start execution
    this.registerAppLinks(core, plugins);

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

  private lazyRegisterAlertsTableConfiguration() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_register_alerts_table_configuration" */
      './common/lib/triggers_actions_ui/register_alerts_table_configuration'
    );
  }

  private lazyApplicationLinks() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_app_links" */
      './common/links/app_links'
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
        users: new subPluginClasses.Users(),
        network: new subPluginClasses.Network(),
        kubernetes: new subPluginClasses.Kubernetes(),
        overview: new subPluginClasses.Overview(),
        timelines: new subPluginClasses.Timelines(),
        management: new subPluginClasses.Management(),
        landingPages: new subPluginClasses.LandingPages(),
        threatIntelligence: new subPluginClasses.ThreatIntelligence(),
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
      cases: subPlugins.cases.start(),
      rules: subPlugins.rules.start(storage),
      exceptions: subPlugins.exceptions.start(storage),
      hosts: subPlugins.hosts.start(storage),
      users: subPlugins.users.start(storage),
      network: subPlugins.network.start(storage),
      timelines: subPlugins.timelines.start(),
      kubernetes: subPlugins.kubernetes.start(),
      management: subPlugins.management.start(core, plugins),
      landingPages: subPlugins.landingPages.start(),
      threatIntelligence: subPlugins.threatIntelligence.start(),
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
      let signal: { name: string | null } = { name: null };
      try {
        if (coreStart.application.capabilities[SERVER_APP_ID].show === true) {
          signal = await coreStart.http.fetch(DETECTION_ENGINE_INDEX_URL, {
            method: 'GET',
          });
        }
      } catch {
        signal = { name: null };
      }

      const configPatternList = coreStart.uiSettings.get(DEFAULT_INDEX_KEY);
      let defaultDataView: SourcererModel['defaultDataView'];
      let kibanaDataViews: SourcererModel['kibanaDataViews'];
      try {
        // check for/generate default Security Solution Kibana data view
        const sourcererDataViews: SecurityDataView = await coreStart.http.fetch(SOURCERER_API_URL, {
          method: 'POST',
          body: JSON.stringify({
            patternList: [...configPatternList, ...(signal.name != null ? [signal.name] : [])],
          }),
        });
        defaultDataView = { ...initDataView, ...sourcererDataViews.defaultDataView };
        kibanaDataViews = sourcererDataViews.kibanaDataViews.map((dataView: KibanaDataView) => ({
          ...initDataView,
          ...dataView,
        }));
      } catch (error) {
        defaultDataView = { ...initDataView, error };
        kibanaDataViews = [];
      }
      const { createStore, createInitialState } = await this.lazyApplicationDependencies();

      const appLibs: AppObservableLibs = { kibana: coreStart };
      const libs$ = new BehaviorSubject(appLibs);

      const timelineInitialState = {
        timeline: {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          ...subPlugins.timelines.store.initialState.timeline!,
          timelineById: {
            ...subPlugins.timelines.store.initialState.timeline.timelineById,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...subPlugins.alerts.storageTimelines!.timelineById,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...subPlugins.rules.storageTimelines!.timelineById,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...subPlugins.exceptions.storageTimelines!.timelineById,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...subPlugins.hosts.storageTimelines!.timelineById,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...subPlugins.network.storageTimelines!.timelineById,
          },
        },
      };

      const tGridReducer = startPlugins.timelines?.getTGridReducer() ?? {};
      const timelineReducer = reduceReducers(
        timelineInitialState.timeline,
        tGridReducer,
        subPlugins.timelines.store.reducer.timeline
      ) as unknown as Reducer<TimelineState, AnyAction>;

      this._store = createStore(
        createInitialState(
          {
            ...subPlugins.hosts.store.initialState,
            ...subPlugins.users.store.initialState,
            ...subPlugins.network.store.initialState,
            ...timelineInitialState,
            ...subPlugins.management.store.initialState,
          },
          {
            defaultDataView,
            kibanaDataViews,
            signalIndexName: signal.name,
            enableExperimental: this.experimentalFeatures,
          }
        ),
        {
          ...subPlugins.hosts.store.reducer,
          ...subPlugins.users.store.reducer,
          ...subPlugins.network.store.reducer,
          timeline: timelineReducer,
          ...subPlugins.management.store.reducer,
          ...tGridReducer,
        },
        libs$.pipe(pluck('kibana')),
        this.storage,
        [...(subPlugins.management.store.middleware ?? [])]
      );
    }
    if (startPlugins.timelines) {
      startPlugins.timelines.setTGridEmbeddedStore(this._store);
    }
    return this._store;
  }

  /**
   * Register deepLinks and appUpdater for all app links, to change deepLinks as needed when licensing changes.
   */
  async registerAppLinks(core: CoreStart, plugins: StartPlugins) {
    licenseService.start(plugins.licensing.license$);
    const licensing = licenseService.getLicenseInformation$();

    const newNavEnabled = core.uiSettings.get(ENABLE_GROUPED_NAVIGATION, false);
    if (newNavEnabled) {
      registerDeepLinksUpdater(this.appUpdater$);
    }

    const { links, getFilteredLinks } = await this.lazyApplicationLinks();

    const linksPermissions: LinksPermissions = {
      experimentalFeatures: this.experimentalFeatures,
      capabilities: core.application.capabilities,
    };

    if (licensing == null) {
      // update without license (defaults to "basic")
      updateAppLinks(links, linksPermissions);

      if (!newNavEnabled) {
        // TODO: remove block when nav flag no longer needed
        this.appUpdater$.next(() => ({
          navLinkStatus: AppNavLinkStatus.hidden, // workaround to prevent main navLink to switch to visible after update. should not be needed
          deepLinks: getDeepLinks(
            this.experimentalFeatures,
            undefined,
            core.application.capabilities
          ),
        }));
      }

      // async links filtering
      updateAppLinks(await getFilteredLinks(core, plugins), linksPermissions);

      return;
    }

    this.licensingSubscription = licensing.subscribe(async (currentLicense) => {
      if (currentLicense.type !== undefined) {
        linksPermissions.license = currentLicense;
      }

      // set initial links to not block rendering
      updateAppLinks(links, linksPermissions);

      if (!newNavEnabled) {
        // TODO: remove block when nav flag no longer needed
        this.appUpdater$.next(() => ({
          navLinkStatus: AppNavLinkStatus.hidden, // workaround to prevent main navLink to switch to visible after update. should not be needed
          deepLinks: getDeepLinks(
            this.experimentalFeatures,
            currentLicense.type,
            core.application.capabilities
          ),
        }));
      }

      // async links filtering
      updateAppLinks(await getFilteredLinks(core, plugins), linksPermissions);
    });
  }
}
