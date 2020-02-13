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
import { SavedObjectsClient } from '../../../../src/core/server';
import { LicensingPluginSetup, ILicense } from '../../licensing/server';
import { EncryptedSavedObjectsPluginStart } from '../../encrypted_saved_objects/server';
import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import {
  PLUGIN_ID,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
} from './constants';
import { licenseService, configService, appContextService } from './services';
import {
  registerEPMRoutes,
  registerDatasourceRoutes,
  registerAgentConfigRoutes,
  registerFleetSetupRoutes,
  registerAgentRoutes,
  registerEnrollmentApiKeyRoutes,
  registerInstallScriptRoutes,
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
  internalSavedObjectsClient: SavedObjectsClient;
}

/**
 * Describes a set of APIs that is available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  savedObjects: SavedObjectsLegacyService;
}

export class IngestManagerPlugin implements Plugin {
  private licensing$!: Observable<ILicense>;
  private config$!: Observable<IngestManagerConfigType>;
  private clusterClient!: ICustomClusterClient;
  private security: SecurityPluginSetup | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

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
              all: [
                AGENT_SAVED_OBJECT_TYPE,
                AGENT_EVENT_SAVED_OBJECT_TYPE,
                ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
              ],
              read: [],
            },
            ui: ['show', 'read', 'write'],
          },
          read: {
            api: [PLUGIN_ID],
            savedObject: {
              all: [],
              read: [
                AGENT_SAVED_OBJECT_TYPE,
                AGENT_EVENT_SAVED_OBJECT_TYPE,
                ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
              ],
            },
            ui: ['show', 'read'],
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
    registerEnrollmentApiKeyRoutes(router);
    registerInstallScriptRoutes({
      router,
      serverInfo: core.http.getServerInfo(),
      basePath: core.http.basePath,
    });
  }

  public async start(
    core: CoreStart,
    plugins: {
      encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
    }
  ) {
    const internalSavedObjectsClient = new SavedObjectsClient(
      core.savedObjects.createInternalRepository()
    );

    appContextService.start({
      internalSavedObjectsClient,
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
