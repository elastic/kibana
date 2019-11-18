/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, Logger, PluginInitializerContext } from 'kibana/server';
import { managementRoutes } from './routes/management';
import { alertsRoutes } from './routes/alerts';
import { registerEndpointsApi } from './routes/endpoints';
import { EndpointHandler } from './handlers/endpoint_handler';
import { EndpointRequestContext } from './handlers/endpoint_handler';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    endpointPlugin?: EndpointRequestContext;
  }
}

export class EndpointPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: {}) {
    core.http.registerRouteHandlerContext(
      'endpointPlugin',
      context => new EndpointHandler(context)
    );
    const router = core.http.createRouter();
    managementRoutes(router);
    alertsRoutes(router);
    registerEndpointsApi(router);
  }

  public start() {
    this.logger.debug('Starting plugin');
  }

  public stop() {
    this.logger.debug('Starting plugin');
  }
}
