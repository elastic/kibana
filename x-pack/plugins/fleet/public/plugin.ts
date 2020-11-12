/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  AppMountParameters,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  CoreStart,
} from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES, AppNavLinkStatus } from '../../../../src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import {
  HomePublicPluginSetup,
  FeatureCatalogueCategory,
} from '../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { PLUGIN_ID, CheckPermissionsResponse, PostIngestSetupResponse } from '../common';
import { BASE_PATH } from './applications/fleet/constants';

import { FleetConfigType } from '../common/types';
import { setupRouteService, appRoutesService } from '../common';
import { licenseService } from './applications/fleet/hooks/use_license';
import { setHttpClient } from './applications/fleet/hooks/use_request/use_request';
import {
  TutorialDirectoryNotice,
  TutorialDirectoryHeaderLink,
  TutorialModuleNotice,
} from './applications/fleet/components/home_integration';
import { createExtensionRegistrationCallback } from './applications/fleet/services/ui_extensions';
import { UIExtensionRegistrationCallback, UIExtensionsStorage } from './applications/fleet/types';

export { FleetConfigType } from '../common/types';

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
}

export interface FleetStartDeps {
  data: DataPublicPluginStart;
}

export class FleetPlugin implements Plugin<FleetSetup, FleetStart, FleetSetupDeps, FleetStartDeps> {
  private config: FleetConfigType;
  private kibanaVersion: string;
  private extensions: UIExtensionsStorage = {};

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<FleetConfigType>();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, deps: FleetSetupDeps) {
    const config = this.config;
    const kibanaVersion = this.kibanaVersion;
    const extensions = this.extensions;

    // Set up http client
    setHttpClient(core.http);

    // Set up license service
    licenseService.start(deps.licensing.license$);

    // Register main Fleet app
    core.application.register({
      id: PLUGIN_ID,
      category: DEFAULT_APP_CATEGORIES.management,
      title: i18n.translate('xpack.fleet.appTitle', { defaultMessage: 'Fleet' }),
      order: 9020,
      euiIconType: 'logoElastic',
      async mount(params: AppMountParameters) {
        const [coreStart, startDeps] = (await core.getStartServices()) as [
          CoreStart,
          FleetStartDeps,
          FleetStart
        ];
        const { renderApp, teardownFleet } = await import('./applications/fleet/');
        const unmount = renderApp(
          coreStart,
          params,
          deps,
          startDeps,
          config,
          kibanaVersion,
          extensions
        );

        return () => {
          unmount();
          teardownFleet(coreStart);
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
      deps.home.tutorials.registerDirectoryNotice(PLUGIN_ID, TutorialDirectoryNotice);
      deps.home.tutorials.registerDirectoryHeaderLink(PLUGIN_ID, TutorialDirectoryHeaderLink);
      deps.home.tutorials.registerModuleNotice(PLUGIN_ID, TutorialModuleNotice);

      deps.home.featureCatalogue.register({
        id: 'fleet',
        title: i18n.translate('xpack.fleet.featureCatalogueTitle', {
          defaultMessage: 'Add Elastic Agent',
        }),
        description: i18n.translate('xpack.fleet.featureCatalogueDescription', {
          defaultMessage: 'Add and manage your fleet of Elastic Agents and integrations.',
        }),
        icon: 'indexManagementApp',
        showOnHomePage: true,
        path: BASE_PATH,
        category: FeatureCatalogueCategory.DATA,
        order: 510,
      });
    }

    return {};
  }

  public async start(core: CoreStart): Promise<FleetStart> {
    let successPromise: ReturnType<FleetStart['isInitialized']>;

    return {
      isInitialized: () => {
        if (!successPromise) {
          successPromise = Promise.resolve().then(async () => {
            const permissionsResponse = await core.http.get<CheckPermissionsResponse>(
              appRoutesService.getCheckPermissionsPath()
            );

            if (permissionsResponse?.success) {
              return core.http
                .post<PostIngestSetupResponse>(setupRouteService.getSetupPath())
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

      registerExtension: createExtensionRegistrationCallback(this.extensions),
    };
  }

  public stop() {}
}
