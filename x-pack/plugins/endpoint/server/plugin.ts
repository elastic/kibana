/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Plugin, CoreSetup, PluginInitializerContext, Logger, CoreStart } from 'kibana/server';
import { first } from 'rxjs/operators';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { createConfig$, EndpointConfigType } from './config';
import { EndpointAppContext } from './types';

import { registerAlertRoutes } from './routes/alerts';
import { registerResolverRoutes } from './routes/resolver';
import { registerIndexPatternRoute } from './routes/index_pattern';
import { registerEndpointRoutes } from './routes/metadata';
import { IngestIndexPatternRetriever } from './index_pattern';
import { endpointAppContextServices } from './endpoint_app_context_services';
import { IngestManagerStartupContract } from '../../ingest_manager/common/types';

export type EndpointPluginStart = void;
export type EndpointPluginSetup = void;
export interface EndpointPluginStartDependencies {
  ingestManager: IngestManagerStartupContract;
}

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
          app: ['endpoint', 'kibana'],
          api: ['resolver'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['save'],
        },
        read: {
          app: ['endpoint', 'kibana'],
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
    registerEndpointRoutes(router, endpointContext);
    registerResolverRoutes(router, endpointContext);
    registerAlertRoutes(router, endpointContext);
    registerIndexPatternRoute(router, endpointContext);
  }

  public start(core: CoreStart, plugins: EndpointPluginStartDependencies) {
    this.logger.debug('Starting plugin');
    endpointAppContextServices.start({
      indexPatternRetriever: new IngestIndexPatternRetriever(
        plugins.ingestManager.esIndexPatternService,
        this.initializerContext.logger
      ),
      agentService: plugins.ingestManager.agentService,
    });
  }
  public stop() {
    this.logger.debug('Stopping plugin');
    endpointAppContextServices.stop();
  }
}
