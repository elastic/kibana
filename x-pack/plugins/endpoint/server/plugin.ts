/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { addRoutes } from './routes';

export class EndpointPlugin implements Plugin {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    addRoutes(router);
  }

  public start() {}
  public stop() {}
}
