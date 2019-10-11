/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';

export class EndpointPlugin implements Plugin<EndpointPluginSetup, EndpointPluginStart> {
  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'endpoint',
      title: 'Endpoint',
      async mount(context, params) {
        const { renderApp } = await import('./application');
        return renderApp(context, params);
      },
    });
  }

  public start() {}
  public stop() {}
}

export type EndpointPluginSetup = ReturnType<EndpointPlugin['setup']>;
export type EndpointPluginStart = ReturnType<EndpointPlugin['start']>;
