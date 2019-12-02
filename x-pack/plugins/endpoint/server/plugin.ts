/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { addRoutes } from './routes';

export type EndpointPluginStart = void;
export type EndpointPluginSetup = void;
export interface EndpointPluginSetupDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface

export interface EndpointPluginStartDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class EndpointPlugin
  implements
    Plugin<
      EndpointPluginStart,
      EndpointPluginSetup,
      EndpointPluginStartDependencies,
      EndpointPluginSetupDependencies
    > {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    addRoutes(router);
  }

  public start() {}
}
