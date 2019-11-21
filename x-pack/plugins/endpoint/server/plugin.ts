/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, PluginInitializerContext, LoggerFactory } from 'kibana/server';
import { managementRoutes } from './routes/management';
import { alertsRoutes } from './routes/alerts';
import { endpointsApi } from './routes/endpoints';
import { addRoutes } from './routes/bootstrap';

export class EndpointPlugin implements Plugin {
  private readonly factory: LoggerFactory;
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.factory = this.initializerContext.logger;
  }

  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    managementRoutes(router);
    alertsRoutes(router);
    endpointsApi(router);
    addRoutes(router, this.factory);
  }

  public start() {}
  public stop() {}
}
