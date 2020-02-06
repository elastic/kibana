/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  ICustomClusterClient,
  SavedObjectsLegacyService,
} from 'kibana/server';
import { LicensingPluginSetup, ILicense } from '../../licensing/server';
import { EncryptedSavedObjectsPluginStart } from '../../encrypted_saved_objects/server';
import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { PLUGIN_ID } from './constants';
import { licenseService, configService, appContextService } from './services';
import {
  registerEPMRoutes,
  registerDatasourceRoutes,
  registerAgentConfigRoutes,
  registerFleetSetupRoutes,
  registerAgentRoutes,
} from './routes';
import { IngestManagerConfigType } from './';

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  features?: FeaturesPluginSetup;
}

export interface IngestManagerAppContext {
  clusterClient: ICustomClusterClient;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginSetup;
}

/**
 * Describes a set of APIs that is available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  savedObjects: SavedObjectsLegacyService;
}

export interface IngestManagerPluginSetup {
  __legacyCompat: {
    registerLegacyAPI: (legacyAPI: LegacyAPI) => void;
  };
}

export class IngestManagerPlugin implements Plugin<IngestManagerPluginSetup> {
  private licensing$!: Observable<ILicense>;
  private config$!: Observable<IngestManagerConfigType>;
  private clusterClient!: ICustomClusterClient;
  private security: SecurityPluginSetup | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  private legacyAPI?: LegacyAPI;
  private readonly getLegacyAPI = () => {
    if (!this.legacyAPI) {
      throw new Error('Legacy API is not registered!');
    }
    return this.legacyAPI;
  };

  public async setup(core: CoreSetup, deps: IngestManagerSetupDeps) {
    this.licensing$ = deps.licensing.license$;
    this.config$ = this.initializerContext.config.create<IngestManagerConfigType>();
    this.clusterClient = core.elasticsearch.createClient(PLUGIN_ID);
    this.security = deps.security;

    // Register feature
    // TODO: Flesh out privileges
    if (deps.features) {
      deps.features.registerFeature({
        id: PLUGIN_ID,
        name: 'Ingest Manager',
        icon: 'savedObjectsApp',
        navLinkId: PLUGIN_ID,
        app: [PLUGIN_ID, 'kibana'],
        privileges: {
          all: {
            api: [PLUGIN_ID],
            savedObject: {
              all: ['agents', 'events', 'enrollment_api_keys'],
              read: [],
            },
            ui: ['show'],
          },
          read: {
            api: [PLUGIN_ID],
            savedObject: {
              all: [],
              read: ['agents', 'events', 'enrollment_api_keys'],
            },
            ui: ['show'],
          },
        },
      });
    }

    // Create router
    const router = core.http.createRouter();

    // Register routes
    registerAgentConfigRoutes(router);
    registerDatasourceRoutes(router);

    // Optional route registration depending on Kibana config
    // TODO: Use this.config$ + if security is enabled to register conditional routing
    registerEPMRoutes(router);
    registerFleetSetupRoutes(router);
    registerAgentRoutes(router);

    return {
      __legacyCompat: {
        registerLegacyAPI: (legacyAPI: LegacyAPI) => {
          this.legacyAPI = legacyAPI;
          const {
            SavedObjectsClient,
            getSavedObjectsRepository,
          } = this.getLegacyAPI().savedObjects;
          const { callAsInternalUser } = this.clusterClient;
          const internalRepository = getSavedObjectsRepository(callAsInternalUser);

          const internalSavedObjectsClient = new SavedObjectsClient(internalRepository);
          appContextService.setInternalSavedObjectsClient(internalSavedObjectsClient);
        },
      },
    };
  }

  public async start(
    core: CoreStart,
    plugins: {
      encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
    }
  ) {
    appContextService.start({
      clusterClient: this.clusterClient,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      security: this.security,
    });
    licenseService.start(this.licensing$);
    configService.start(this.config$);
  }

  public async stop() {
    appContextService.stop();
    licenseService.stop();
    configService.stop();
  }
}
