/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'kibana/server';
import { addRoutes } from './routes';
import { PluginSetupContract as FeaturesPluginSetupContract } from 'x-pack/plugins/features/server';

export interface PluginsSetup {
  features: FeaturesPluginSetupContract;
}

export class EndpointPlugin implements Plugin<void, void, PluginsSetup, {}> {
  public setup(core: CoreSetup, plugins: PluginsSetup) {
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
  public stop() {}
}
