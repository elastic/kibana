/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { HomeServerPluginSetup } from 'src/plugins/home/server';
import {
  CoreSetup,
  CoreStart,
  Logger,
  PluginInitializerContext,
} from '../../../../src/core/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { createSpacesTutorialContextFactory } from './lib/spaces_tutorial_context_factory';
import { registerSpacesUsageCollector } from './usage_collection';
import { SpacesService, SpacesServiceStart } from './spaces_service';
import { SpacesServiceSetup } from './spaces_service';
import { ConfigType } from './config';
import { initSpacesRequestInterceptors } from './lib/request_interceptors';
import { initExternalSpacesApi } from './routes/api/external';
import { initInternalSpacesApi } from './routes/api/internal';
import { initSpacesViewsRoutes } from './routes/views';
import { setupCapabilities } from './capabilities';
import { SpacesSavedObjectsService } from './saved_objects';
import { DefaultSpaceService } from './default_space';
import { SpacesLicenseService } from '../common/licensing';
import {
  SpacesClientRepositoryFactory,
  SpacesClientService,
  SpacesClientWrapper,
} from './spaces_client';

export interface PluginsSetup {
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  usageCollection?: UsageCollectionSetup;
  home?: HomeServerPluginSetup;
}

export interface PluginsStart {
  features: FeaturesPluginStart;
}

export interface SpacesPluginSetup {
  spacesService: SpacesServiceSetup;
  spacesClient: {
    setClientRepositoryFactory: (factory: SpacesClientRepositoryFactory) => void;
    registerClientWrapper: (wrapper: SpacesClientWrapper) => void;
  };
}

export interface SpacesPluginStart {
  spacesService: SpacesServiceStart;
}

export class Plugin {
  private readonly config$: Observable<ConfigType>;

  private readonly kibanaIndexConfig$: Observable<{ kibana: { index: string } }>;

  private readonly log: Logger;

  private readonly spacesLicenseService = new SpacesLicenseService();

  private readonly spacesClientService: SpacesClientService;

  private readonly spacesService: SpacesService;

  private spacesServiceStart?: SpacesServiceStart;

  private defaultSpaceService?: DefaultSpaceService;

  constructor(initializerContext: PluginInitializerContext) {
    this.config$ = initializerContext.config.create<ConfigType>();
    this.kibanaIndexConfig$ = initializerContext.config.legacy.globalConfig$;
    this.log = initializerContext.logger.get();
    this.spacesService = new SpacesService();
    this.spacesClientService = new SpacesClientService((message) => this.log.debug(message));
  }

  public async setup(
    core: CoreSetup<PluginsStart>,
    plugins: PluginsSetup
  ): Promise<SpacesPluginSetup> {
    const spacesClientSetup = this.spacesClientService.setup({ config$: this.config$ });

    const spacesServiceSetup = this.spacesService.setup({
      basePath: core.http.basePath,
    });

    const getSpacesService = () => {
      if (!this.spacesServiceStart) {
        throw new Error('spaces service has not been initialized!');
      }
      return this.spacesServiceStart;
    };

    const savedObjectsService = new SpacesSavedObjectsService();
    savedObjectsService.setup({ core, getSpacesService });

    const { license } = this.spacesLicenseService.setup({ license$: plugins.licensing.license$ });

    this.defaultSpaceService = new DefaultSpaceService();
    this.defaultSpaceService.setup({
      coreStatus: core.status,
      getSavedObjects: async () => (await core.getStartServices())[0].savedObjects,
      license$: plugins.licensing.license$,
      spacesLicense: license,
      logger: this.log,
    });

    initSpacesViewsRoutes({
      httpResources: core.http.resources,
      basePath: core.http.basePath,
      logger: this.log,
    });

    const externalRouter = core.http.createRouter();
    initExternalSpacesApi({
      externalRouter,
      log: this.log,
      getStartServices: core.getStartServices,
      getImportExportObjectLimit: core.savedObjects.getImportExportObjectLimit,
      getSpacesService,
    });

    const internalRouter = core.http.createRouter();
    initInternalSpacesApi({
      internalRouter,
      getSpacesService,
    });

    initSpacesRequestInterceptors({
      http: core.http,
      log: this.log,
      getSpacesService,
      features: plugins.features,
    });

    setupCapabilities(core, getSpacesService, this.log);

    if (plugins.usageCollection) {
      registerSpacesUsageCollector(plugins.usageCollection, {
        kibanaIndexConfig$: this.kibanaIndexConfig$,
        features: plugins.features,
        licensing: plugins.licensing,
      });
    }

    if (plugins.home) {
      plugins.home.tutorials.addScopedTutorialContextFactory(
        createSpacesTutorialContextFactory(getSpacesService)
      );
    }

    return {
      spacesClient: spacesClientSetup,
      spacesService: spacesServiceSetup,
    };
  }

  public start(core: CoreStart) {
    const spacesClientStart = this.spacesClientService.start(core);

    this.spacesServiceStart = this.spacesService.start({
      basePath: core.http.basePath,
      spacesClientService: spacesClientStart,
    });

    return {
      spacesService: this.spacesServiceStart,
    };
  }

  public stop() {
    if (this.defaultSpaceService) {
      this.defaultSpaceService.stop();
    }
  }
}
