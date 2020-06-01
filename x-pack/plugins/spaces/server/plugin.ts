/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { HomeServerPluginSetup } from 'src/plugins/home/server';
import { CoreSetup, Logger, PluginInitializerContext } from '../../../../src/core/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server';
import { SecurityPluginSetup } from '../../security/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SpacesAuditLogger } from './lib/audit_logger';
import { createSpacesTutorialContextFactory } from './lib/spaces_tutorial_context_factory';
import { registerSpacesUsageCollector } from './usage_collection';
import { SpacesService } from './spaces_service';
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

export interface PluginsSetup {
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
  home?: HomeServerPluginSetup;
}

export interface PluginsStart {
  features: FeaturesPluginStart;
}

export interface SpacesPluginSetup {
  spacesService: SpacesServiceSetup;
}

export class Plugin {
  private readonly pluginId = 'spaces';

  private readonly config$: Observable<ConfigType>;

  private readonly kibanaIndexConfig$: Observable<{ kibana: { index: string } }>;

  private readonly log: Logger;

  private readonly spacesLicenseService = new SpacesLicenseService();

  private defaultSpaceService?: DefaultSpaceService;

  constructor(initializerContext: PluginInitializerContext) {
    this.config$ = initializerContext.config.create<ConfigType>();
    this.kibanaIndexConfig$ = initializerContext.config.legacy.globalConfig$;
    this.log = initializerContext.logger.get();
  }

  public async start() {}

  public async setup(
    core: CoreSetup<PluginsStart>,
    plugins: PluginsSetup
  ): Promise<SpacesPluginSetup> {
    const service = new SpacesService(this.log);

    const spacesService = await service.setup({
      http: core.http,
      getStartServices: core.getStartServices,
      authorization: plugins.security ? plugins.security.authz : null,
      auditLogger: new SpacesAuditLogger(plugins.security?.audit.getLogger(this.pluginId)),
      config$: this.config$,
    });

    const savedObjectsService = new SpacesSavedObjectsService();
    savedObjectsService.setup({ core, spacesService });

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
      spacesService,
    });

    const internalRouter = core.http.createRouter();
    initInternalSpacesApi({
      internalRouter,
      spacesService,
    });

    initSpacesRequestInterceptors({
      http: core.http,
      log: this.log,
      spacesService,
      features: plugins.features,
    });

    setupCapabilities(core, spacesService, this.log);

    if (plugins.usageCollection) {
      registerSpacesUsageCollector(plugins.usageCollection, {
        kibanaIndexConfig$: this.kibanaIndexConfig$,
        features: plugins.features,
        licensing: plugins.licensing,
      });
    }

    if (plugins.security) {
      plugins.security.registerSpacesService(spacesService);
    }

    if (plugins.home) {
      plugins.home.tutorials.addScopedTutorialContextFactory(
        createSpacesTutorialContextFactory(spacesService)
      );
    }

    return {
      spacesService,
    };
  }

  public stop() {
    if (this.defaultSpaceService) {
      this.defaultSpaceService.stop();
    }
  }
}
