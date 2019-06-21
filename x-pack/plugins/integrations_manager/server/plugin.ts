/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerRoute } from '../common/types';
import { fetchList } from './registry';
import { routes } from './routes';

export interface CoreSetup {
  http: HttpServiceSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CoreStart {}

export interface HttpServiceSetup {
  route(route: ServerRoute | ServerRoute[]): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginInitializerContext {}

export type PluginSetup = ReturnType<Plugin['setup']>;
export type PluginStart = ReturnType<Plugin['start']>;

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {}
  public setup(core: CoreSetup) {
    const { route } = core.http;

    // map routes to handlers
    routes.forEach(route);

    return {
      getList: fetchList,
    };
  }
  public start(core: CoreStart) {}
}
