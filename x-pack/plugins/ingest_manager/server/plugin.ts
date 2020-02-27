/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { EncryptedSavedObjectsPluginStart } from '../../encrypted_saved_objects/server';
import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { PLUGIN_ID } from './constants';
import { appContextService } from './services';
import { registerDatasourceRoutes, registerAgentConfigRoutes } from './routes';
import { IngestManagerConfigType } from '../common';

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  features?: FeaturesPluginSetup;
}

export interface IngestManagerAppContext {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginSetup;
  config$?: Observable<IngestManagerConfigType>;
}

export class IngestManagerPlugin implements Plugin {
  private config$: Observable<IngestManagerConfigType>;
  private security: SecurityPluginSetup | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config$ = this.initializerContext.config.create<IngestManagerConfigType>();
  }

  public async setup(core: CoreSetup, deps: IngestManagerSetupDeps) {
    if (deps.security) {
      this.security = deps.security;
    }

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
              all: [],
              read: [],
            },
            ui: ['show'],
          },
          read: {
            api: [PLUGIN_ID],
            savedObject: {
              all: [],
              read: [],
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
    // restore when EPM & Fleet features are added
    // const config = await this.config$.pipe(first()).toPromise();
    // if (config.epm.enabled) registerEPMRoutes(router);
    // if (config.fleet.enabled) registerFleetSetupRoutes(router);
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
    });
  }

  public async stop() {
    appContextService.stop();
  }
}
