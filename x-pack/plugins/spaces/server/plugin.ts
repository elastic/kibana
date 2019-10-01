/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { SavedObjectsLegacyService, CoreSetup } from 'src/core/server';
import { Logger, PluginInitializerContext } from 'src/core/server';
import { CapabilitiesModifier } from 'src/legacy/server/capabilities';
import { SecurityPlugin } from '../../../legacy/plugins/security';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { OptionalPlugin } from '../../../legacy/server/lib/optional_plugin';
import { XPackMainPlugin } from '../../../legacy/plugins/xpack_main/xpack_main';
import { createDefaultSpace } from './lib/create_default_space';
// @ts-ignore
import { AuditLogger } from '../../../../server/lib/audit_logger';

import { spacesSavedObjectsClientWrapperFactory } from './lib/saved_objects_client/saved_objects_client_wrapper_factory';
import { SpacesAuditLogger } from './lib/audit_logger';
import { createSpacesTutorialContextFactory } from './lib/spaces_tutorial_context_factory';
import { initInternalApis } from './routes/api/internal';
import { getSpacesUsageCollector } from './lib/get_spaces_usage_collector';
import { SpacesService } from './spaces_service';
import { SpacesServiceSetup } from './spaces_service/spaces_service';
import { ConfigType } from './config';
import { getActiveSpace } from './lib/get_active_space';
import { toggleUICapabilities } from './lib/toggle_ui_capabilities';
import { initSpacesRequestInterceptors } from './lib/request_interceptors';
import { initExternalSpacesApi } from './routes/api/external';

/**
 * Describes a set of APIs that is available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  savedObjects: SavedObjectsLegacyService;
  usage: {
    collectorSet: {
      register: (collector: any) => void;
    };
  };
  tutorial: {
    addScopedTutorialContextFactory: (factory: any) => void;
  };
  capabilities: {
    registerCapabilitiesModifier: (provider: CapabilitiesModifier) => void;
  };
  auditLogger: {
    create: (pluginId: string) => AuditLogger;
  };
  legacyConfig: {
    kibanaIndex: string;
    serverDefaultRoute: string;
  };
  xpackMain: XPackMainPlugin;
  // TODO: Spaces has a circular dependency with Security right now.
  // Security is not yet available when init runs, so this is wrapped in an optional plugin for the time being.
  security: OptionalPlugin<SecurityPlugin>;
}

export interface PluginsSetup {
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface SpacesPluginSetup {
  spacesService: SpacesServiceSetup;
  __legacyCompat: {
    // TODO: We currently need the legacy plugin to inform this plugin when it is safe to create the default space.
    // The NP does not have the equivilent ES connection/health/comapt checks that the legacy world does.
    // See: https://github.com/elastic/kibana/issues/43456
    createDefaultSpace: () => Promise<void>;
  };
  registerLegacyAPI: (legacyAPI: LegacyAPI) => void;
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
    // TODO: checkLicense replacement

    const service = new SpacesService(this.log, this.getLegacyAPI);

    const spacesService = await service.setup({
      http: core.http,
      elasticsearch: core.elasticsearch,
      getSecurity: () => this.getLegacyAPI().security,
      getSpacesAuditLogger: this.getSpacesAuditLogger,
      config$: this.config$,
    });

    const externalRouter = core.http.createRouter();
    initExternalSpacesApi({
      externalRouter,
      log: this.log,
      getSavedObjects: () => this.getLegacyAPI().savedObjects,
      spacesService,
    });

    const internalRouter = core.http.createRouter();
    initInternalApis({
      internalRouter,
      getLegacyAPI: this.getLegacyAPI,
      spacesService,
      serverBasePath: core.http.basePath.serverBasePath,
    });

    initSpacesRequestInterceptors({
      http: core.http,
      log: this.log,
      getLegacyAPI: this.getLegacyAPI,
      spacesService,
      features: plugins.features,
    });

    return {
      spacesService,
      __legacyCompat: {
        createDefaultSpace: async () => {
          const esClient = await core.elasticsearch.adminClient$.pipe(take(1)).toPromise();
          return createDefaultSpace({
            esClient,
            savedObjects: this.getLegacyAPI().savedObjects,
          });
        },
      },
      registerLegacyAPI: (legacyAPI: LegacyAPI) => {
        this.legacyAPI = legacyAPI;
        this.setupLegacyComponents(core, spacesService, plugins.features, plugins.licensing);
      },
    };
  }

  public stop() {}

  private setupLegacyComponents(
    core: CoreSetup,
    spacesService: SpacesServiceSetup,
    featuresSetup: FeaturesPluginSetup,
    licensingSetup: LicensingPluginSetup
  ) {
    const legacyAPI = this.getLegacyAPI();
    const { addScopedSavedObjectsClientWrapperFactory, types } = legacyAPI.savedObjects;
    addScopedSavedObjectsClientWrapperFactory(
      Number.MIN_SAFE_INTEGER,
      'spaces',
      spacesSavedObjectsClientWrapperFactory(spacesService, types)
    );
    legacyAPI.tutorial.addScopedTutorialContextFactory(
      createSpacesTutorialContextFactory(spacesService)
    );
    legacyAPI.capabilities.registerCapabilitiesModifier(async (request, uiCapabilities) => {
      const spacesClient = await spacesService.scopedClient(request);
      try {
        const activeSpace = await getActiveSpace(
          spacesClient,
          core.http.basePath.get(request),
          core.http.basePath.serverBasePath
        );
        const features = featuresSetup.getFeatures();
        return toggleUICapabilities(features, uiCapabilities, activeSpace);
      } catch (e) {
        return uiCapabilities;
      }
    });
    // Register a function with server to manage the collection of usage stats
    legacyAPI.usage.collectorSet.register(
      getSpacesUsageCollector({
        kibanaIndex: legacyAPI.legacyConfig.kibanaIndex,
        usage: legacyAPI.usage,
        features: featuresSetup,
        licensing: licensingSetup,
      })
    );
  }
}
