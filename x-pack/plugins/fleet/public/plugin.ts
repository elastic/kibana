/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

import { once } from 'lodash';

import type { SpacesPluginStart } from '../../spaces/public';

import type { CloudStart } from '../../cloud/public';

import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';

import { DEFAULT_APP_CATEGORIES, AppNavLinkStatus } from '../../../../src/core/public';

import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import type { LicensingPluginStart } from '../../licensing/public';
import type { CloudSetup } from '../../cloud/public';
import type { GlobalSearchPluginSetup } from '../../global_search/public';
import {
  PLUGIN_ID,
  INTEGRATIONS_PLUGIN_ID,
  setupRouteService,
  appRoutesService,
  calculateAuthz,
  parseExperimentalConfigValue,
} from '../common';
import type {
  CheckPermissionsResponse,
  PostFleetSetupResponse,
  FleetAuthz,
  ExperimentalFeatures,
} from '../common';

import type { FleetConfigType } from '../common/types';

import { CUSTOM_LOGS_INTEGRATION_NAME, INTEGRATIONS_BASE_PATH } from './constants';
import { licenseService } from './hooks';
import { setHttpClient } from './hooks/use_request';
import { createPackageSearchProvider } from './search_provider';
import { TutorialDirectoryHeaderLink, TutorialModuleNotice } from './components/home_integration';
import { createExtensionRegistrationCallback } from './services/ui_extensions';
import { ExperimentalFeaturesService } from './services/experimental_features';
import type { UIExtensionRegistrationCallback, UIExtensionsStorage } from './types';
import { LazyCustomLogsAssetsExtension } from './lazy_custom_logs_assets_extension';

export type { FleetConfigType } from '../common/types';

import { setCustomIntegrations } from './services/custom_integrations';

// We need to provide an object instead of void so that dependent plugins know when Fleet
// is disabled.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FleetSetup {}

/**
 * Describes public Fleet plugin contract returned at the `start` stage.
 */
export interface FleetStart {
  /** Authorization for the current user */
  authz: FleetAuthz;
  registerExtension: UIExtensionRegistrationCallback;
  isInitialized: () => Promise<true>;
}

export interface FleetSetupDeps {
  data: DataPublicPluginSetup;
  home?: HomePublicPluginSetup;
  cloud?: CloudSetup;
  globalSearch?: GlobalSearchPluginSetup;
  customIntegrations: CustomIntegrationsSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface FleetStartDeps {
  licensing: LicensingPluginStart;
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  customIntegrations: CustomIntegrationsStart;
  share: SharePluginStart;
  cloud?: CloudStart;
}

export interface FleetStartServices extends CoreStart, Exclude<FleetStartDeps, 'cloud'> {
  storage: Storage;
  share: SharePluginStart;
  cloud?: CloudSetup & CloudStart;
  spaces?: SpacesPluginStart;
  authz: FleetAuthz;
}

export class FleetPlugin implements Plugin<FleetSetup, FleetStart, FleetSetupDeps, FleetStartDeps> {
  private config: FleetConfigType;
  private kibanaVersion: string;
  private extensions: UIExtensionsStorage = {};
  private experimentalFeatures: ExperimentalFeatures;
  private storage = new Storage(localStorage);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<FleetConfigType>();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup<FleetStartDeps, FleetStart>, deps: FleetSetupDeps) {
    const config = this.config;
    const kibanaVersion = this.kibanaVersion;
    const extensions = this.extensions;

    setCustomIntegrations(deps.customIntegrations);

    // TODO: this is a contract leak and an issue.  We shouldn't be setting a module-level
    // variable from plugin setup.  Refactor to an abstraction, if necessary.
    // Set up http client
    setHttpClient(core.http);

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
        const [coreStartServices, startDepsServices, fleetStart] = await core.getStartServices();
        const cloud =
          deps.cloud && startDepsServices.cloud
            ? { ...deps.cloud, ...startDepsServices.cloud }
            : undefined;

        const startServices: FleetStartServices = {
          ...coreStartServices,
          ...startDepsServices,
          storage: this.storage,
          cloud,
          authz: await fleetStart.authz,
        };
        const { renderApp, teardownIntegrations } = await import('./applications/integrations');

        const Tracker =
          deps.usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
        const unmount = renderApp(
          startServices,
          params,
          config,
          kibanaVersion,
          extensions,
          Tracker
        );

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
        const [coreStartServices, startDepsServices, fleetStart] = await core.getStartServices();
        const cloud =
          deps.cloud && startDepsServices.cloud
            ? { ...deps.cloud, ...startDepsServices.cloud }
            : undefined;
        const startServices: FleetStartServices = {
          ...coreStartServices,
          ...startDepsServices,
          storage: this.storage,
          cloud,
          authz: await fleetStart.authz,
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

  public start(core: CoreStart, deps: FleetStartDeps): FleetStart {
    ExperimentalFeaturesService.init(this.experimentalFeatures);
    const registerExtension = createExtensionRegistrationCallback(this.extensions);
    const getPermissions = once(() =>
      core.http.get<CheckPermissionsResponse>(appRoutesService.getCheckPermissionsPath())
    );

    // Set up license service
    licenseService.start(deps.licensing.license$);

    registerExtension({
      package: CUSTOM_LOGS_INTEGRATION_NAME,
      view: 'package-detail-assets',
      Component: LazyCustomLogsAssetsExtension,
    });
    const { capabilities } = core.application;

    //  capabilities.fleetv2 returns fleet privileges and capabilities.fleet returns integrations privileges
    return {
      authz: calculateAuthz({
        fleet: {
          all: capabilities.fleetv2.all as boolean,
          setup: false,
        },
        integrations: {
          all: capabilities.fleet.all as boolean,
          read: capabilities.fleet.read as boolean,
        },
        isSuperuser: false,
      }),

      isInitialized: once(async () => {
        const permissionsResponse = await getPermissions();

        if (permissionsResponse?.success) {
          const { isInitialized } = await core.http.post<PostFleetSetupResponse>(
            setupRouteService.getSetupPath()
          );
          if (!isInitialized) {
            throw new Error('Unknown setup error');
          }

          return true;
        } else {
          throw new Error(permissionsResponse?.error || 'Unknown permissions error');
        }
      }),

      registerExtension,
    };
  }

  public stop() {}
}
