/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { CoreSetup } from 'src/core/server';

const IM_ROOT = '/api/integrations_manager';

class Plugin {
  public setup(core: CoreSetup) {
    const { server } = core.http;
    server.route({
      method: 'GET',
      path: IM_ROOT,
      options: {
        tags: ['access:integrations_manager'],
      },
      handler: async req => {
        return { message: 'INTEGRATIONS MANAGER WORKS' };
      },
    });
  }
}

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin();
}
