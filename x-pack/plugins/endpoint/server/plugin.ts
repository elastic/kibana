/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { managementRoutes } from './routes/management';
import { alertsRoutes } from './routes/alerts';
import { endpointsApi } from './routes/endpoints';

export class EndpointPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    managementRoutes(router);
    alertsRoutes(router);
    endpointsApi(router);
  }

  public start() {}
  public stop() {}
}
