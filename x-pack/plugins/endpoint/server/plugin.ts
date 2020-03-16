/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  Plugin,
  CoreSetup,
  PluginInitializerContext,
  Logger,
  ScopedClusterClient,
  ICustomClusterClient,
} from 'kibana/server';
import { first } from 'rxjs/operators';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { createConfig$, EndpointConfigType } from './config';
import { EndpointAppContext } from './types';

import { addRoutes } from './routes';
import { registerEndpointRoutes } from './routes/metadata';
import { registerAlertRoutes } from './routes/alerts';
import { registerResolverRoutes } from './routes/resolver';
import { registerWhitelistRoutes } from './routes/whitelist';

export type EndpointPluginStart = void;
export type EndpointPluginSetup = void;
export interface EndpointPluginStartDependencies {} // eslint-disable-line @typescript-eslint/no-empty-interface

export interface EndpointPluginSetupDependencies {
  features: FeaturesPluginSetupContract;
}

export class EndpointPlugin
  implements
    Plugin<
      EndpointPluginSetup,
      EndpointPluginStart,
      EndpointPluginSetupDependencies,
      EndpointPluginStartDependencies
    > {
  private readonly logger: Logger;
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get('endpoint');
  }
  public setup(core: CoreSetup, plugins: EndpointPluginSetupDependencies) {
    plugins.features.registerFeature({
      id: 'endpoint',
      name: 'Endpoint',
      icon: 'bug',
      navLinkId: 'endpoint',
      app: ['endpoint', 'kibana'],
      privileges: {
        all: {
          api: ['resolver'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['save'],
        },
        read: {
          api: [],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });
    const endpointContext = {
      logFactory: this.initializerContext.logger,
      config: (): Promise<EndpointConfigType> => {
        return createConfig$(this.initializerContext)
          .pipe(first())
          .toPromise();
      },
    } as EndpointAppContext;
    const router = core.http.createRouter();
    // const tcl = core.elasticsearch.createClient('test'); // TODO???
    const cl = core.elasticsearch.adminClient.callAsInternalUser;
    addRoutes(router);
    registerEndpointRoutes(router, endpointContext);
    registerResolverRoutes(router, endpointContext);
    registerAlertRoutes(router, endpointContext);
    registerWhitelistRoutes(router, endpointContext, cl);
  }

  public start() {
    this.logger.debug('Starting plugin');
  }
  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
