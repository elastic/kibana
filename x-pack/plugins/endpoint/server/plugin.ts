/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Plugin, CoreSetup, PluginInitializerContext, Logger } from 'kibana/server';
import { first } from 'rxjs/operators';
import { addRoutes } from './routes';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { createConfig$, EndpointConfigType } from './config';
import { EndpointAppContext } from './types';
import { registerEndpointRoutes } from './routes/endpoints';

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
    addRoutes(router);
    registerEndpointRoutes(router, endpointContext);
  }

  public start() {
    this.logger.debug('Starting plugin');
  }
  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
