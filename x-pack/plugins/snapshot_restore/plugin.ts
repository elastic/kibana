/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerRoutes } from './server/routes/api/register_routes';
import { Core, Plugins } from './shim';

export class Plugin {
  public start(core: Core, plugins: Plugins): void {
    const router = core.http.createRouter('/api/snapshot_restore/');

    // Register routes
    registerRoutes(router);
  }
}
