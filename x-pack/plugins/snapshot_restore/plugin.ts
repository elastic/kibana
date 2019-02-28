/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import { PLUGIN } from './common/constants';
import { createShim } from './shim';

export class Plugin {
  public server: Legacy.Server;

  constructor(server: Legacy.Server) {
    this.server = server;
  }

  public start(): void {
    const server = this.server;
    const { core, plugins } = createShim(server, PLUGIN.ID);
    const router = core.http.createRouter('/api/snapshot/');

    plugins.license.registerLicenseChecker(
      server,
      PLUGIN.ID,
      PLUGIN.NAME,
      PLUGIN.MINIMUM_LICENSE_REQUIRED
    );
    router.get('test', async (req, callWithRequest, responseToolkit) => {
      return responseToolkit.response('hello world');
    });
  }
}
