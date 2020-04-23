/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  SavedObjectsServiceStart,
} from 'kibana/server';
import { LicensingPluginSetup } from '../../licensing/server';
import {
  EncryptedSavedObjectsPluginStart,
  EncryptedSavedObjectsPluginSetup,
} from '../../encrypted_saved_objects/server';
import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import {
  PLUGIN_ID,
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  DATASOURCE_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
} from './constants';
import { registerEncryptedSavedObjects } from './saved_objects';
import {
  registerEPMRoutes,
  registerDatasourceRoutes,
  registerAgentConfigRoutes,
  registerSetupRoutes,
  registerAgentRoutes,
  registerEnrollmentApiKeyRoutes,
  registerInstallScriptRoutes,
} from './routes';

import { IngestManagerConfigType } from '../common';
import { appContextService, ESIndexPatternSavedObjectService } from './services';
import { ESIndexPatternService, AgentService } from './services';
import { getAgentStatusById } from './services/agents';

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  features?: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

export type IngestManagerStartDeps = object;

export interface IngestManagerAppContext {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginSetup;
  config$?: Observable<IngestManagerConfigType>;
  savedObjects: SavedObjectsServiceStart;
}

export type IngestManagerSetupContract = void;

const allSavedObjectTypes = [
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  DATASOURCE_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
];

/**
 * Describes public IngestManager plugin contract returned at the `startup` stage.
 */
export interface IngestManagerStartContract {
  esIndexPatternService: ESIndexPatternService;
  agentService: AgentService;
}

export class IngestManagerPlugin
  implements
    Plugin<
      IngestManagerSetupContract,
      IngestManagerStartContract,
      IngestManagerSetupDeps,
      IngestManagerStartDeps
    > {
  private config$: Observable<IngestManagerConfigType>;
  private security: SecurityPluginSetup | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config$ = this.initializerContext.config.create<IngestManagerConfigType>();
  }

  public async setup(core: CoreSetup, deps: IngestManagerSetupDeps) {
    if (deps.security) {
      this.security = deps.security;
    }

    registerEncryptedSavedObjects(deps.encryptedSavedObjects);

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
            api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-all`],
            app: [PLUGIN_ID, 'kibana'],
            savedObject: {
              all: allSavedObjectTypes,
              read: [],
            },
            ui: ['show', 'read', 'write'],
          },
          read: {
            api: [`${PLUGIN_ID}-read`],
            app: [PLUGIN_ID, 'kibana'],
            savedObject: {
              all: [],
              read: allSavedObjectTypes,
            },
            ui: ['show', 'read'],
          },
        },
      });
    }

    const router = core.http.createRouter();
    const config = await this.config$.pipe(first()).toPromise();

    // Register routes
    registerAgentConfigRoutes(router);
    registerDatasourceRoutes(router);

    // Conditional routes
    if (config.epm.enabled) {
      registerEPMRoutes(router);
    }

    if (config.fleet.enabled) {
      registerSetupRoutes(router);
      registerAgentRoutes(router);
      registerEnrollmentApiKeyRoutes(router);
      registerInstallScriptRoutes({
        router,
        serverInfo: core.http.getServerInfo(),
        basePath: core.http.basePath,
      });
    }
  }

  public async start(
    core: CoreStart,
    plugins: {
      encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
    }
  ) {
    appContextService.start({
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      security: this.security,
      config$: this.config$,
      savedObjects: core.savedObjects,
    });
    return {
      esIndexPatternService: new ESIndexPatternSavedObjectService(),
      agentService: {
        getAgentStatusById,
      },
    };
  }

  public async stop() {
    appContextService.stop();
  }
}
