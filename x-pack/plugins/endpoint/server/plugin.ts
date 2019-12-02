/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { addRoutes } from './routes';

export type EndpointPluginStart = void;
export type EndpointPluginSetup = void;
export interface EndpointPluginSetupDependencies {
  features: FeaturesPluginSetupContract;
}

export interface EndpointPluginStartDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class EndpointPlugin
  implements
    Plugin<
      EndpointPluginStart,
      EndpointPluginSetup,
      EndpointPluginStartDependencies,
      EndpointPluginSetupDependencies
    > {
  public setup(core: CoreSetup, plugins: EndpointPluginSetupDependencies) {
    plugins.features.registerFeature({
      id: 'endpoint',
      name: 'Endpoint',
      icon: 'bug',
      navLinkId: 'endpoint',
      app: ['endpoint', 'kibana'],
      privileges: {
        read: {
          api: ['resolver'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
      },
    });
    const router = core.http.createRouter();
    addRoutes(router);
  }

  public start() {}
}
