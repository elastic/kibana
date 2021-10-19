/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  CoreStart,
} from 'src/core/public';
import { i18n } from '@kbn/i18n';

import type { NavigationPublicPluginStart } from 'src/plugins/navigation/public';

import type {
  CustomIntegrationsStart,
  CustomIntegrationsSetup,
} from 'src/plugins/custom_integrations/public';

import type { SharePluginStart } from 'src/plugins/share/public';

import { DEFAULT_APP_CATEGORIES, AppNavLinkStatus } from '../../../../src/core/public';

import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import type { LicensingPluginSetup } from '../../licensing/public';
import type { CloudSetup } from '../../cloud/public';
import type { GlobalSearchPluginSetup } from '../../global_search/public';
import { PLUGIN_ID, INTEGRATIONS_PLUGIN_ID, setupRouteService, appRoutesService } from '../common';
import type { CheckPermissionsResponse, PostFleetSetupResponse } from '../common';

import type { FleetConfigType } from '../common/types';

import { CUSTOM_LOGS_INTEGRATION_NAME, INTEGRATIONS_BASE_PATH } from './constants';
import { licenseService } from './hooks';
import { setHttpClient } from './hooks/use_request';
import { createPackageSearchProvider } from './search_provider';
import { TutorialDirectoryHeaderLink, TutorialModuleNotice } from './components/home_integration';
import { createExtensionRegistrationCallback } from './services/ui_extensions';
import type { UIExtensionRegistrationCallback, UIExtensionsStorage } from './types';
import { LazyCustomLogsAssetsExtension } from './lazy_custom_logs_assets_extension';

export { FleetConfigType } from '../common/types';

import { setCustomIntegrations } from './services/custom_integrations';

// We need to provide an object instead of void so that dependent plugins know when Fleet
// is disabled.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FleetSetup {}

/**
 * Describes public Fleet plugin contract returned at the `start` stage.
 */
export interface FleetStart {
  registerExtension: UIExtensionRegistrationCallback;
  isInitialized: () => Promise<true>;
}

export interface FleetSetupDeps {
  licensing: LicensingPluginSetup;
  data: DataPublicPluginSetup;
  home?: HomePublicPluginSetup;
  cloud?: CloudSetup;
  globalSearch?: GlobalSearchPluginSetup;
  customIntegrations: CustomIntegrationsSetup;
}

export interface FleetStartDeps {
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  customIntegrations: CustomIntegrationsStart;
  share: SharePluginStart;
}

export interface FleetStartServices extends CoreStart, FleetStartDeps {
  storage: Storage;
  share: SharePluginStart;
  cloud?: CloudSetup;
}

export class FleetPlugin implements Plugin<FleetSetup, FleetStart, FleetSetupDeps, FleetStartDeps> {
  private config: FleetConfigType;
  private kibanaVersion: string;
  private extensions: UIExtensionsStorage = {};
  private storage = new Storage(localStorage);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<FleetConfigType>();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, deps: FleetSetupDeps) {
    const config = this.config;
    const kibanaVersion = this.kibanaVersion;
    const extensions = this.extensions;

    setCustomIntegrations(deps.customIntegrations);

    // TODO: this is a contract leak and an issue.  We shouldn't be setting a module-level
    // variable from plugin setup.  Refactor to an abstraction, if necessary.
    // Set up http client
    setHttpClient(core.http);

    // Set up license service
    licenseService.start(deps.licensing.license$);

    // Register Integrations app
    core.application.register({
      id: INTEGRATIONS_PLUGIN_ID,
      category: DEFAULT_APP_CATEGORIES.management,
      appRoute: '/app/integrations',
      title: i18n.translate('xpack.fleet.integrationsAppTitle', {
        defaultMessage: 'Integrations',
      }),
      order: 9019,
      euiIconType: 'logoElastic',
      mount: async (params: AppMountParameters) => {
        const [coreStartServices, startDepsServices] = (await core.getStartServices()) as [
          CoreStart,
          FleetStartDeps,
          FleetStart
        ];
        const startServices: FleetStartServices = {
          ...coreStartServices,
          ...startDepsServices,
          storage: this.storage,
          cloud: deps.cloud,
        };
        const { renderApp, teardownIntegrations } = await import('./applications/integrations');
        const unmount = renderApp(startServices, params, config, kibanaVersion, extensions);

        return () => {
          unmount();
          teardownIntegrations(startServices);
        };
      },
    });

    // Register main Fleet app
    core.application.register({
      id: PLUGIN_ID,
      category: DEFAULT_APP_CATEGORIES.management,
      title: i18n.translate('xpack.fleet.appTitle', { defaultMessage: 'Fleet' }),
      order: 9020,
      euiIconType: 'logoElastic',
      appRoute: '/app/fleet',
      mount: async (params: AppMountParameters) => {
        const [coreStartServices, startDepsServices] = (await core.getStartServices()) as [
          CoreStart,
          FleetStartDeps,
          FleetStart
        ];
        const startServices: FleetStartServices = {
          ...coreStartServices,
          ...startDepsServices,
          storage: this.storage,
          cloud: deps.cloud,
        };
        const { renderApp, teardownFleet } = await import('./applications/fleet');
        const unmount = renderApp(startServices, params, config, kibanaVersion, extensions);

        return () => {
          unmount();
          teardownFleet(startServices);
        };
      },
    });

    // BWC < 7.11 redirect /app/ingestManager to /app/fleet
    core.application.register({
      id: 'ingestManager',
      category: DEFAULT_APP_CATEGORIES.management,
      navLinkStatus: AppNavLinkStatus.hidden,
      title: i18n.translate('xpack.fleet.oldAppTitle', { defaultMessage: 'Ingest Manager' }),
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        coreStart.application.navigateToApp('fleet', {
          path: params.history.location.hash,
        });
        return () => {};
      },
    });

    // Register components for home/add data integration
    if (deps.home) {
      deps.home.tutorials.registerDirectoryHeaderLink(PLUGIN_ID, TutorialDirectoryHeaderLink);
      deps.home.tutorials.registerModuleNotice(PLUGIN_ID, TutorialModuleNotice);

      deps.home.featureCatalogue.register({
        id: 'fleet',
        title: i18n.translate('xpack.fleet.featureCatalogueTitle', {
          defaultMessage: 'Add Elastic Agent integrations',
        }),
        description: i18n.translate('xpack.fleet.featureCatalogueDescription', {
          defaultMessage: 'Add and manage integrations with Elastic Agent',
        }),
        icon: 'indexManagementApp',
        showOnHomePage: true,
        path: INTEGRATIONS_BASE_PATH,
        category: FeatureCatalogueCategory.DATA,
        order: 510,
      });
    }

    if (deps.globalSearch) {
      deps.globalSearch.registerResultProvider(createPackageSearchProvider(core));
    }

    return {};
  }

  public start(core: CoreStart): FleetStart {
    let successPromise: ReturnType<FleetStart['isInitialized']>;
    const registerExtension = createExtensionRegistrationCallback(this.extensions);

    registerExtension({
      package: CUSTOM_LOGS_INTEGRATION_NAME,
      view: 'package-detail-assets',
      Component: LazyCustomLogsAssetsExtension,
    });

    return {
      isInitialized: () => {
        if (!successPromise) {
          successPromise = Promise.resolve().then(async () => {
            const permissionsResponse = await core.http.get<CheckPermissionsResponse>(
              appRoutesService.getCheckPermissionsPath()
            );

            if (permissionsResponse?.success) {
              return core.http
                .post<PostFleetSetupResponse>(setupRouteService.getSetupPath())
                .then(({ isInitialized }) =>
                  isInitialized
                    ? Promise.resolve(true)
                    : Promise.reject(new Error('Unknown setup error'))
                );
            } else {
              throw new Error(permissionsResponse?.error || 'Unknown permissions error');
            }
          });
        }

        return successPromise;
      },
      registerExtension,
    };
  }

  public stop() {}
}
