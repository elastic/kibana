/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './common';
import { Core } from './shim';
import {
  registerGetRoute,
  registerAddRoute,
  registerUpdateRoute,
  registerDeleteRoute,
} from './server/routes/api';

export class Plugin {
  public start(core: Core): void {
    const router = core.http.createRouter(API_BASE_PATH);

    // Register routes.
    registerGetRoute(router);
    registerAddRoute(router);
    registerUpdateRoute(router);
    registerDeleteRoute(router);
  }
}
