/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';
import { combineLatestWith } from 'rxjs/operators';
import type * as H from 'history';
import type {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Plugin as IPlugin,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES, AppNavLinkStatus } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type {
  PluginSetup,
  PluginStart,
  SetupPlugins,
  StartPlugins,
  StartServices,
  SubPlugins,
  StartedSubPlugins,
  StartPluginsDependencies,
} from './types';
import { initTelemetry, TelemetryService } from './common/lib/telemetry';
import { KibanaServices } from './common/lib/kibana/services';
import { SOLUTION_NAME } from './common/translations';

import {
  APP_ID,
  APP_UI_ID,
  APP_PATH,
  APP_ICON_SOLUTION,
  ENABLE_GROUPED_NAVIGATION,
} from '../common/constants';

import { getDeepLinks, registerDeepLinksUpdater } from './app/deep_links';
import type { LinksPermissions } from './common/links';
import { updateAppLinks } from './common/links';
import { navLinks$ } from './common/links/nav_links';
import { licenseService } from './common/hooks/use_license';
import type { SecuritySolutionUiConfigType } from './common/types';
import { ExperimentalFeaturesService } from './common/experimental_features_service';

import { getLazyEndpointPolicyEditExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_edit_extension';
import { LazyEndpointPolicyCreateExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_create_extension';
import { LazyEndpointPolicyCreateMultiStepExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_create_multi_step_extension';
import { getLazyEndpointPackageCustomExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_package_custom_extension';
import { getLazyEndpointPolicyResponseExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_response_extension';
import { getLazyEndpointGenericErrorsListExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_generic_errors_list';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { LazyEndpointCustomAssetsExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_custom_assets_extension';

import type { SecurityAppStore } from './common/store/types';

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  /**
   * The current Kibana branch. e.g. 'main'
   */
  readonly kibanaBranch: string;
  /**
   * The current Kibana version. e.g. '8.0.0' or '8.0.0-SNAPSHOT'
   */
  readonly kibanaVersion: string;
  /**
   * For internal use. Specify which version of the Detection Rules fleet package to install
   * when upgrading rules. If not provided, the latest compatible package will be installed,
   * or if running from a dev environment or -SNAPSHOT build, the latest pre-release package
   * will be used (if fleet is available or not within an airgapped environment).
   *
   * Note: This is for `upgrade only`, which occurs by means of the `useUpgradeSecurityPackages`
   * hook when navigating to a Security Solution page. The package version specified in
   * `fleet_packages.json` in project root will always be installed first on Kibana start if
   * the package is not already installed.
   */
  readonly prebuiltRulesPackageVersion?: string;
  private config: SecuritySolutionUiConfigType;
  private telemetry: TelemetryService;

  readonly experimentalFeatures: ExperimentalFeatures;
  private isSidebarEnabled$: BehaviorSubject<boolean>;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<SecuritySolutionUiConfigType>();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.kibanaBranch = initializerContext.env.packageInfo.branch;
    this.prebuiltRulesPackageVersion = this.config.prebuiltRulesPackageVersion;
    this.isSidebarEnabled$ = new BehaviorSubject<boolean>(true);
    this.telemetry = new TelemetryService();
  }
  private appUpdater$ = new Subject<AppUpdater>();

  private storage = new Storage(localStorage);
  private sessionStorage = new Storage(sessionStorage);

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
  private _actionsRegistered?: boolean = false;

  public setup(
    core: CoreSetup<StartPluginsDependencies, PluginStart>,
    plugins: SetupPlugins
  ): PluginSetup {
    initTelemetry(
      {
        usageCollection: plugins.usageCollection,
      },
      APP_UI_ID
    );
    const telemetryContext = {
      prebuiltRulesPackageVersion: this.prebuiltRulesPackageVersion,
    };
    this.telemetry.setup({ analytics: core.analytics }, telemetryContext);

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
    const startServices = async (params: AppMountParameters<unknown>): Promise<StartServices> => {
      const [coreStart, startPluginsDeps] = await core.getStartServices();
      const { apm } = await import('@elastic/apm-rum');
      const { SecuritySolutionTemplateWrapper } = await import('./app/home/template_wrapper');

      const { savedObjectsTaggingOss, ...startPlugins } = startPluginsDeps;

      const services: StartServices = {
        ...coreStart,
        ...startPlugins,
        apm,
        savedObjectsTagging: savedObjectsTaggingOss.getTaggingApi(),
        storage: this.storage,
        sessionStorage: this.sessionStorage,
        security: startPluginsDeps.security,
        onAppLeave: params.onAppLeave,
        securityLayout: {
          getPluginWrapper: () => SecuritySolutionTemplateWrapper,
        },
        savedObjectsManagement: startPluginsDeps.savedObjectsManagement,
        isSidebarEnabled$: this.isSidebarEnabled$,
        telemetry: this.telemetry.start(),
      };
      return services;
    };

    core.application.register({
      id: APP_UI_ID,
      title: SOLUTION_NAME,
      appRoute: APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      // Initializing app as visible to make sure it appears on the Kibana home page, it is hidden when deepLinks update
      navLinkStatus: AppNavLinkStatus.visible,
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
        const store = await this.store(coreStart, startPlugins, subPlugins);
        const services = await startServices(params);
        await this.registerActions(store, params.history, services);

        const { renderApp } = await this.lazyApplicationDependencies();
        const { getSubPluginRoutesByCapabilities } = await this.lazyHelpersForRoutes();

        return renderApp({
          ...params,
          services,
          store,
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

        const { manageOldSiemRoutes } = await this.lazyHelpersForRoutes();
        const subscription = this.appUpdater$.subscribe(() => {
          // wait for app initialization to set the links
          manageOldSiemRoutes(coreStart);
          subscription.unsubscribe();
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

  public start(core: CoreStart, plugins: StartPlugins): PluginStart {
    KibanaServices.init({
      ...core,
      ...plugins,
      kibanaBranch: this.kibanaBranch,
      kibanaVersion: this.kibanaVersion,
      prebuiltRulesPackageVersion: this.prebuiltRulesPackageVersion,
    });
    ExperimentalFeaturesService.init({ experimentalFeatures: this.experimentalFeatures });
    licenseService.start(plugins.licensing.license$);

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
        registerExtension({
          package: 'endpoint',
          view: 'package-generic-errors-list',
          Component: getLazyEndpointGenericErrorsListExtension(core, plugins),
        });
      }

      registerExtension({
        package: 'endpoint',
        view: 'package-policy-create',
        Component: LazyEndpointPolicyCreateExtension,
      });

      registerExtension({
        package: 'endpoint',
        view: 'package-policy-create-multi-step',
        Component: LazyEndpointPolicyCreateMultiStepExtension,
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

    return {
      getNavLinks$: () => navLinks$,
      setIsSidebarEnabled: (isSidebarEnabled: boolean) =>
        this.isSidebarEnabled$.next(isSidebarEnabled),
    };
  }

  public stop() {
    licenseService.stop();
    return {};
  }

  private lazyHelpersForRoutes() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazyHelpersForRoutes" */
      './helpers'
    );
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

  private lazyActions() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "actions" */
      './actions'
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
        dashboards: new subPluginClasses.Dashboards(),
        explore: new subPluginClasses.Explore(),
        kubernetes: new subPluginClasses.Kubernetes(),
        overview: new subPluginClasses.Overview(),
        timelines: new subPluginClasses.Timelines(),
        management: new subPluginClasses.Management(),
        cloudDefend: new subPluginClasses.CloudDefend(),
        cloudSecurityPosture: new subPluginClasses.CloudSecurityPosture(),
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
      alerts: subPlugins.alerts.start(storage),
      cases: subPlugins.cases.start(),
      cloudDefend: subPlugins.cloudDefend.start(),
      cloudSecurityPosture: subPlugins.cloudSecurityPosture.start(),
      dashboards: subPlugins.dashboards.start(),
      exceptions: subPlugins.exceptions.start(storage),
      explore: subPlugins.explore.start(storage),
      kubernetes: subPlugins.kubernetes.start(),
      management: subPlugins.management.start(core, plugins),
      overview: subPlugins.overview.start(),
      rules: subPlugins.rules.start(storage),
      threatIntelligence: subPlugins.threatIntelligence.start(),
      timelines: subPlugins.timelines.start(),
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
      const { createStoreFactory } = await this.lazyApplicationDependencies();

      this._store = await createStoreFactory(
        coreStart,
        startPlugins,
        subPlugins,
        this.storage,
        this.experimentalFeatures
      );
    }
    if (startPlugins.timelines) {
      startPlugins.timelines.setTimelineEmbeddedStore(this._store);
    }
    return this._store;
  }

  private async registerActions(
    store: SecurityAppStore,
    history: H.History,
    services: StartServices
  ) {
    if (!this._actionsRegistered) {
      const { registerActions } = await this.lazyActions();
      registerActions(store, history, services);
      this._actionsRegistered = true;
    }
  }

  /**
   * Register deepLinks and appUpdater for all app links, to change deepLinks as needed when licensing changes.
   */
  async registerAppLinks(core: CoreStart, plugins: StartPlugins) {
    const { links, getFilteredLinks } = await this.lazyApplicationLinks();

    const { license$ } = plugins.licensing;
    const newNavEnabled$ = core.uiSettings.get$<boolean>(ENABLE_GROUPED_NAVIGATION, true);

    let appLinksSubscription: Subscription | null = null;
    license$.pipe(combineLatestWith(newNavEnabled$)).subscribe(async ([license, newNavEnabled]) => {
      const linksPermissions: LinksPermissions = {
        experimentalFeatures: this.experimentalFeatures,
        capabilities: core.application.capabilities,
      };

      if (license.type !== undefined) {
        linksPermissions.license = license;
      }

      if (appLinksSubscription) {
        appLinksSubscription.unsubscribe();
        appLinksSubscription = null;
      }

      if (newNavEnabled) {
        appLinksSubscription = registerDeepLinksUpdater(this.appUpdater$);
      } else {
        // old nav links update
        this.appUpdater$.next(() => ({
          navLinkStatus: AppNavLinkStatus.hidden,
          deepLinks: getDeepLinks(
            this.experimentalFeatures,
            license.type,
            core.application.capabilities
          ),
        }));
      }

      // set initial links to not block rendering
      updateAppLinks(links, linksPermissions);

      // set filtered links asynchronously
      const filteredLinks = await getFilteredLinks(core, plugins);
      updateAppLinks(filteredLinks, linksPermissions);
    });
  }
}
