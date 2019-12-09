/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, IClusterClient, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { first } from 'rxjs/operators';
import { managementRoutes } from './routes/management';
import { alertsRoutes } from './routes/alerts';
import { registerEndpointRoutes } from './routes/endpoints';
import { EndpointHandler, EndpointRequestContext } from './handlers/endpoint_handler';
import { EndpointAppContext } from './types';
import { createConfig$, EndpointConfigType } from './config';
import { registerBootstrapRoutes } from './routes/bootstrap';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    endpointPlugin?: EndpointRequestContext;
  }
}

export class EndpointPlugin implements Plugin {
  private readonly logger: Logger;
  private clusterClient?: IClusterClient;
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get('endpoint');
  }

  public async setup(core: CoreSetup, deps: {}) {
    this.clusterClient = core.elasticsearch.createClient('endpoint-plugin');
    const endpointContext = {
      clusterClient: this.clusterClient,
      logFactory: this.initializerContext.logger,
      config: (): Promise<EndpointConfigType> => {
        return this.getConfig();
      },
    } as EndpointAppContext;
    const endpointHandler: EndpointRequestContext = new EndpointHandler(endpointContext);
    core.http.registerRouteHandlerContext('endpointPlugin', () => endpointHandler);
    const router = core.http.createRouter();
    managementRoutes(router);
    alertsRoutes(router);
    registerEndpointRoutes(router, endpointHandler);
    registerBootstrapRoutes(router, endpointContext);
  }

  public start() {
    this.logger.debug('Starting plugin');
  }

  public stop() {
    this.logger.debug('Starting plugin');
    if (this.clusterClient) {
      this.clusterClient.close();
      this.clusterClient = undefined;
    }
  }

  private async getConfig(): Promise<EndpointConfigType> {
    return createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();
  }
}
