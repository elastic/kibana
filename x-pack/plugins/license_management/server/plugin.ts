/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';

import { ApiRoutes } from './routes';
import { isEsError } from './shared_imports';
import { Dependencies } from './types';

export class LicenseManagementServerPlugin implements Plugin<void, void, any, any> {
  private readonly apiRoutes = new ApiRoutes();

  setup({ http }: CoreSetup, { licensing, security }: Dependencies) {
    const router = http.createRouter();

    this.apiRoutes.setup({
      router,
      plugins: {
        licensing,
      },
      lib: {
        isEsError,
      },
      config: {
        isSecurityEnabled: security !== undefined,
      },
    });
  }

  start() {}
  stop() {}
}
