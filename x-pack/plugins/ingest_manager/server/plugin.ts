/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { CoreSetup, Plugin, PluginInitializerContext } from 'kibana/server';
import { LicensingPluginSetup, ILicense } from '../../licensing/server';
import { IngestManagerConfigType } from './';
import { PLUGIN_ID } from './constants';
import { licenseService, configService, agentConfigService } from './services';
import { registerEPMRoutes, registerDataStreamRoutes, registerAgentConfigRoutes } from './routes';

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
}

export class IngestManagerPlugin implements Plugin {
  private licensing$!: Observable<ILicense>;
  private config$!: Observable<IngestManagerConfigType>;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup, deps: IngestManagerSetupDeps) {
    this.licensing$ = deps.licensing.license$;
    this.config$ = this.initializerContext.config.create<IngestManagerConfigType>();

    // Create router and Elasticsearch client
    const clusterClient = core.elasticsearch.createClient(PLUGIN_ID);
    const router = core.http.createRouter();
    const ingestManagerContext = {
      clusterClient,
    };

    // Register routes
    registerAgentConfigRoutes(router, ingestManagerContext);
    registerDataStreamRoutes(router, ingestManagerContext);

    // Optional route registration depending on Kibana config
    // TODO: Use this.config$ to register routing
    registerEPMRoutes(router, ingestManagerContext);
  }

  public async start() {
    licenseService.start(this.licensing$);
    configService.start(this.config$);
  }

  public async stop() {
    licenseService.stop();
    configService.stop();
  }
}
