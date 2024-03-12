/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  Logger,
  PluginInitializerContext,
  Plugin,
  CoreSetup,
} from '@kbn/core/server';
import type {
  SearchConnectorsPluginSetup as SearchConnectorsPluginSetup,
  SearchConnectorsPluginStart as SearchConnectorsPluginStart,
  SetupDependencies,
  StartDependencies,
} from './types';
import { registerConnectorsRoutes } from './routes/connectors_routes';

export interface RouteDependencies {
  http: CoreSetup<StartDependencies>['http'];
  logger: Logger;
  router: IRouter;
}

export class SearchConnectorsPlugin
  implements
    Plugin<
      SearchConnectorsPluginSetup,
      SearchConnectorsPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup({ getStartServices, http }: CoreSetup<StartDependencies>) {
    const router = http.createRouter();
    getStartServices().then(([]) => {
      const dependencies = {
        http,
        logger: this.logger,
        router,
      };

      registerConnectorsRoutes(dependencies);
    });

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
