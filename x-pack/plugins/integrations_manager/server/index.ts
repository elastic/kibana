/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { CoreSetup } from 'src/core/server';
import { routes } from './routes';

export class Plugin {
  public setup(core: CoreSetup, initializerContext: PluginInitializerContext) {
    const { server } = core.http;
    routes.forEach(route => server.route(route));
  }
}
