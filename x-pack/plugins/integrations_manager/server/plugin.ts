/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, ServerPluginInitializerContext } from '../common/types';
import { fetchList } from './registry';
import { routes } from './routes';

export type PluginSetup = ReturnType<Plugin['setup']>;

export class Plugin {
  constructor(initializerContext: ServerPluginInitializerContext) {}
  public setup(core: CoreSetup) {
    const { route } = core.http;

    // map routes to handlers
    routes.forEach(route);

    return {
      getList: fetchList,
    };
  }
}
