/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { HomeServerPluginSetup } from 'src/plugins/home/server';
import {
  SavedObjectsLegacyService,
  CoreSetup,
  Logger,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { SecurityPluginSetup } from '../../security/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { createDefaultSpace } from './lib/create_default_space';
// @ts-ignore
import { AuditLogger } from '../../../../server/lib/audit_logger';
import { spacesSavedObjectsClientWrapperFactory } from './lib/saved_objects_client/saved_objects_client_wrapper_factory';
import { SpacesAuditLogger } from './lib/audit_logger';
import { createSpacesTutorialContextFactory } from './lib/spaces_tutorial_context_factory';
import { registerSpacesUsageCollector } from './lib/spaces_usage_collector';
import { SpacesService } from './spaces_service';
import { SpacesServiceSetup } from './spaces_service';
import { ConfigType } from './config';
import { toggleUICapabilities } from './lib/toggle_ui_capabilities';
import { initSpacesRequestInterceptors } from './lib/request_interceptors';
import { initExternalSpacesApi } from './routes/api/external';
import { initInternalSpacesApi } from './routes/api/internal';
import { initSpacesViewsRoutes } from './routes/views';

/**
 * Describes a set of APIs that is available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  savedObjects: SavedObjectsLegacyService;
  auditLogger: {
    create: (pluginId: string) => AuditLogger;
  };
  legacyConfig: {
    kibanaIndex: string;
  };
}

export interface PluginsSetup {
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
  home?: HomeServerPluginSetup;
}

export interface SpacesPluginSetup {
  spacesService: SpacesServiceSetup;
  __legacyCompat: {
    registerLegacyAPI: (legacyAPI: LegacyAPI) => void;
    // TODO: We currently need the legacy plugin to inform this plugin when it is safe to create the default space.
    // The NP does not have the equivilent ES connection/health/comapt checks that the legacy world does.
    // See: https://github.com/elastic/kibana/issues/43456
    createDefaultSpace: () => Promise<void>;
  };
}

export class Plugin {
  private readonly pluginId = 'spaces';

  private readonly config$: Observable<ConfigType>;

  private readonly log: Logger;

  private legacyAPI?: LegacyAPI;
  private readonly getLegacyAPI = () => {
    if (!this.legacyAPI) {
      throw new Error('Legacy API is not registered!');
    }
    return this.legacyAPI;
  };

  private spacesAuditLogger?: SpacesAuditLogger;
  private readonly getSpacesAuditLogger = () => {
    if (!this.spacesAuditLogger) {
      this.spacesAuditLogger = new SpacesAuditLogger(
        this.getLegacyAPI().auditLogger.create(this.pluginId)
      );
    }
    return this.spacesAuditLogger;
  };

  constructor(initializerContext: PluginInitializerContext) {
    this.config$ = initializerContext.config.create<ConfigType>();
    this.log = initializerContext.logger.get();
  }

  public async start() {}

  public async setup(core: CoreSetup, plugins: PluginsSetup): Promise<SpacesPluginSetup> {
    const service = new SpacesService(this.log, this.getLegacyAPI);

    const spacesService = await service.setup({
      http: core.http,
      elasticsearch: core.elasticsearch,
      authorization: plugins.security ? plugins.security.authz : null,
      getSpacesAuditLogger: this.getSpacesAuditLogger,
      config$: this.config$,
    });

    const viewRouter = core.http.createRouter();
    initSpacesViewsRoutes({
      viewRouter,
      cspHeader: core.http.csp.header,
    });

    const externalRouter = core.http.createRouter();
    initExternalSpacesApi({
      externalRouter,
      log: this.log,
      getSavedObjects: () => this.getLegacyAPI().savedObjects,
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
      getLegacyAPI: this.getLegacyAPI,
      spacesService,
      features: plugins.features,
    });

    core.capabilities.registerSwitcher(async (request, uiCapabilities) => {
      try {
        const activeSpace = await spacesService.getActiveSpace(request);
        const features = plugins.features.getFeatures();
        return toggleUICapabilities(features, uiCapabilities, activeSpace);
      } catch (e) {
        return uiCapabilities;
      }
    });

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
      __legacyCompat: {
        registerLegacyAPI: (legacyAPI: LegacyAPI) => {
          this.legacyAPI = legacyAPI;
          this.setupLegacyComponents(
            spacesService,
            plugins.features,
            plugins.licensing,
            plugins.usageCollection
          );
        },
        createDefaultSpace: async () => {
          return await createDefaultSpace({
            esClient: core.elasticsearch.adminClient,
            savedObjects: this.getLegacyAPI().savedObjects,
          });
        },
      },
    };
  }

  public stop() {}

  private setupLegacyComponents(
    spacesService: SpacesServiceSetup,
    featuresSetup: FeaturesPluginSetup,
    licensingSetup: LicensingPluginSetup,
    usageCollectionSetup?: UsageCollectionSetup
  ) {
    const legacyAPI = this.getLegacyAPI();
    const { addScopedSavedObjectsClientWrapperFactory, types } = legacyAPI.savedObjects;
    addScopedSavedObjectsClientWrapperFactory(
      Number.MIN_SAFE_INTEGER,
      'spaces',
      spacesSavedObjectsClientWrapperFactory(spacesService, types)
    );
    // Register a function with server to manage the collection of usage stats
    registerSpacesUsageCollector(usageCollectionSetup, {
      kibanaIndex: legacyAPI.legacyConfig.kibanaIndex,
      features: featuresSetup,
      licensing: licensingSetup,
    });
  }
}
