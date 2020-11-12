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
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import {
  HomePublicPluginSetup,
  FeatureCatalogueCategory,
} from '../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { PLUGIN_ID, CheckPermissionsResponse, PostIngestSetupResponse } from '../common';
import { BASE_PATH } from './applications/fleet/constants';

import { IngestManagerConfigType } from '../common/types';
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

export { IngestManagerConfigType } from '../common/types';

// We need to provide an object instead of void so that dependent plugins know when Ingest Manager
// is disabled.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IngestManagerSetup {}

/**
 * Describes public IngestManager plugin contract returned at the `start` stage.
 */
export interface IngestManagerStart {
  registerExtension: UIExtensionRegistrationCallback;
  isInitialized: () => Promise<true>;
}

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  data: DataPublicPluginSetup;
  home?: HomePublicPluginSetup;
}

export interface IngestManagerStartDeps {
  data: DataPublicPluginStart;
}

export interface IngestManagerStartServices extends CoreStart, IngestManagerStartDeps {}

export class IngestManagerPlugin
  implements
    Plugin<IngestManagerSetup, IngestManagerStart, IngestManagerSetupDeps, IngestManagerStartDeps> {
  private config: IngestManagerConfigType;
  private kibanaVersion: string;
  private extensions: UIExtensionsStorage = {};

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<IngestManagerConfigType>();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, deps: IngestManagerSetupDeps) {
    const config = this.config;
    const kibanaVersion = this.kibanaVersion;
    const extensions = this.extensions;

    // Set up http client
    setHttpClient(core.http);

    // Set up license service
    licenseService.start(deps.licensing.license$);

    // Register main Ingest Manager app
    core.application.register({
      id: PLUGIN_ID,
      category: DEFAULT_APP_CATEGORIES.management,
      title: i18n.translate('xpack.fleet.appTitle', { defaultMessage: 'Fleet' }),
      order: 9020,
      euiIconType: 'logoElastic',
      mount: async (params: AppMountParameters) => {
        const [coreStartServices, startDepsServices] = (await core.getStartServices()) as [
          CoreStart,
          IngestManagerStartDeps,
          IngestManagerStart
        ];
        const startServices: IngestManagerStartServices = {
          ...coreStartServices,
          ...startDepsServices,
        };
        const { renderApp, teardownIngestManager } = await import('./applications/fleet');
        const unmount = renderApp(
          startServices,
          params,
          deps,
          startDepsServices,
          config,
          kibanaVersion,
          extensions
        );

        return () => {
          unmount();
          teardownIngestManager(startServices);
        };
      },
    });

    // Register components for home/add data integration
    if (deps.home) {
      deps.home.tutorials.registerDirectoryNotice(PLUGIN_ID, TutorialDirectoryNotice);
      deps.home.tutorials.registerDirectoryHeaderLink(PLUGIN_ID, TutorialDirectoryHeaderLink);
      deps.home.tutorials.registerModuleNotice(PLUGIN_ID, TutorialModuleNotice);

      deps.home.featureCatalogue.register({
        id: 'ingestManager',
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

  public async start(core: CoreStart): Promise<IngestManagerStart> {
    let successPromise: ReturnType<IngestManagerStart['isInitialized']>;

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
