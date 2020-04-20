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
  RecursiveReadonly,
} from 'kibana/server';
import { deepFreeze } from '../../../../src/core/utils';
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
import {
  appContextService,
  ESIndexPatternService,
  ESIndexPatternSavedObjectService,
} from './services';

/**
 * Describes public IngestManager plugin contract returned at the `setup` stage.
 */
export interface IngestManagerSetupContract {
  esIndexPatternService: ESIndexPatternService;
}

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  features?: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

export interface IngestManagerAppContext {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginSetup;
  config$?: Observable<IngestManagerConfigType>;
  savedObjects: SavedObjectsServiceStart;
}

const allSavedObjectTypes = [
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  DATASOURCE_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
];

export class IngestManagerPlugin implements Plugin<IngestManagerSetupContract> {
  private config$: Observable<IngestManagerConfigType>;
  private security: SecurityPluginSetup | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config$ = this.initializerContext.config.create<IngestManagerConfigType>();
  }

  public async setup(
    core: CoreSetup,
    deps: IngestManagerSetupDeps
  ): Promise<RecursiveReadonly<IngestManagerSetupContract>> {
    if (deps.security) {
      this.security = deps.security;
    }

    // Encrypted saved objects
    deps.encryptedSavedObjects.registerType({
      type: ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
      attributesToEncrypt: new Set(['api_key']),
      attributesToExcludeFromAAD: new Set([
        'name',
        'type',
        'api_key_id',
        'config_id',
        'created_at',
        'updated_at',
        'expire_at',
        'active',
      ]),
    });
    deps.encryptedSavedObjects.registerType({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      attributesToEncrypt: new Set(['fleet_enroll_username', 'fleet_enroll_password']),
      attributesToExcludeFromAAD: new Set([
        'name',
        'type',
        'is_default',
        'hosts',
        'ca_sha256',
        'config',
      ]),
    });
    deps.encryptedSavedObjects.registerType({
      type: AGENT_SAVED_OBJECT_TYPE,
      attributesToEncrypt: new Set(['default_api_key']),
      attributesToExcludeFromAAD: new Set([
        'shared_id',
        'type',
        'active',
        'enrolled_at',
        'access_api_key_id',
        'version',
        'user_provided_metadata',
        'local_metadata',
        'config_id',
        'last_updated',
        'last_checkin',
        'config_revision',
        'config_newest_revision',
        'updated_at',
        'current_error_events',
      ]),
    });

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
    return deepFreeze({
      esIndexPatternService: new ESIndexPatternSavedObjectService(),
    });
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
  }

  public async stop() {
    appContextService.stop();
  }
}
