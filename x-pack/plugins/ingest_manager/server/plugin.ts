/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { CoreSetup, Plugin, PluginInitializerContext, ICustomClusterClient } from 'kibana/server';
import { LicensingPluginSetup, ILicense } from '../../licensing/server';
import { PluginSetupContract as SecurityPluginSetup } from '../../security/server';
import { PLUGIN_ID } from './constants';
import { licenseService, configService, appContextService } from './services';
import { registerEPMRoutes, registerDataStreamRoutes, registerAgentConfigRoutes } from './routes';
import { IngestManagerConfigType } from './';

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
}

export interface IngestManagerAppContext {
  clusterClient: ICustomClusterClient;
  security?: SecurityPluginSetup;
}

export class IngestManagerPlugin implements Plugin {
  private licensing$!: Observable<ILicense>;
  private config$!: Observable<IngestManagerConfigType>;
  private appContext: IngestManagerAppContext | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup, deps: IngestManagerSetupDeps) {
    this.licensing$ = deps.licensing.license$;
    this.config$ = this.initializerContext.config.create<IngestManagerConfigType>();
    this.appContext = {
      clusterClient: core.elasticsearch.createClient(PLUGIN_ID),
      security: deps.security,
    };

    // Create router
    const router = core.http.createRouter();

    // Register routes
    registerAgentConfigRoutes(router);
    registerDataStreamRoutes(router);

    // Optional route registration depending on Kibana config
    // TODO: Use this.config$ + if security is enabled to register conditional routing
    registerEPMRoutes(router);
  }

  public async start() {
    appContextService.start(this.appContext!);
    licenseService.start(this.licensing$);
    configService.start(this.config$);
  }

  public async stop() {
    appContextService.stop();
    licenseService.stop();
    configService.stop();
  }
}
