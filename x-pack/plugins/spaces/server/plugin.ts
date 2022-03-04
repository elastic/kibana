/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';
import type { HomeServerPluginSetup } from 'src/plugins/home/server';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import type {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server';
import type { LicensingPluginSetup } from '../../licensing/server';
import { SpacesLicenseService } from '../common/licensing';
import { setupCapabilities } from './capabilities';
import type { ConfigType } from './config';
import { DefaultSpaceService } from './default_space';
import { initSpacesRequestInterceptors } from './lib/request_interceptors';
import { createSpacesTutorialContextFactory } from './lib/spaces_tutorial_context_factory';
import { initExternalSpacesApi } from './routes/api/external';
import { initInternalSpacesApi } from './routes/api/internal';
import { initSpacesViewsRoutes } from './routes/views';
import { SpacesSavedObjectsService } from './saved_objects';
import type { SpacesClientRepositoryFactory, SpacesClientWrapper } from './spaces_client';
import { SpacesClientService } from './spaces_client';
import type { SpacesServiceSetup, SpacesServiceStart } from './spaces_service';
import { SpacesService } from './spaces_service';
import type { SpacesRequestHandlerContext } from './types';
import { registerSpacesUsageCollector } from './usage_collection';
import { UsageStatsService } from './usage_stats';

export interface PluginsSetup {
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  usageCollection?: UsageCollectionSetup;
  home?: HomeServerPluginSetup;
}

export interface PluginsStart {
  features: FeaturesPluginStart;
}

/**
 * Setup contract for the Spaces plugin.
 */
export interface SpacesPluginSetup {
  /**
   * Service for interacting with spaces.
   */
  spacesService: SpacesServiceSetup;

  /**
   * Registries exposed for the security plugin to transparently provide authorization and audit logging.
   * @private
   */
  spacesClient: {
    /**
     * Sets the client repository factory.
     * @private
     */
    setClientRepositoryFactory: (factory: SpacesClientRepositoryFactory) => void;
    /**
     * Registers a client wrapper.
     * @private
     */
    registerClientWrapper: (wrapper: SpacesClientWrapper) => void;
  };
}

/**
 * Start contract for the Spaces plugin.
 */
export interface SpacesPluginStart {
  /** Service for interacting with spaces. */
  spacesService: SpacesServiceStart;
}

export class SpacesPlugin
  implements Plugin<SpacesPluginSetup, SpacesPluginStart, PluginsSetup, PluginsStart>
{
  private readonly config$: Observable<ConfigType>;

  private readonly log: Logger;

  private readonly spacesLicenseService = new SpacesLicenseService();

  private readonly spacesClientService: SpacesClientService;

  private readonly spacesService: SpacesService;

  private spacesServiceStart?: SpacesServiceStart;

  private defaultSpaceService?: DefaultSpaceService;

  constructor(initializerContext: PluginInitializerContext) {
    this.config$ = initializerContext.config.create<ConfigType>();
    this.log = initializerContext.logger.get();
    this.spacesService = new SpacesService();
    this.spacesClientService = new SpacesClientService((message) => this.log.debug(message));
  }

  public setup(core: CoreSetup<PluginsStart>, plugins: PluginsSetup): SpacesPluginSetup {
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

    const usageStatsServicePromise = new UsageStatsService(this.log).setup({
      getStartServices: core.getStartServices,
    });

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

    const externalRouter = core.http.createRouter<SpacesRequestHandlerContext>();
    initExternalSpacesApi({
      externalRouter,
      log: this.log,
      getStartServices: core.getStartServices,
      getSpacesService,
      usageStatsServicePromise,
    });

    const internalRouter = core.http.createRouter<SpacesRequestHandlerContext>();
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
        kibanaIndex: core.savedObjects.getKibanaIndex(),
        features: plugins.features,
        licensing: plugins.licensing,
        usageStatsServicePromise,
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
