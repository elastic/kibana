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
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SEARCH_PROJECT_SETTINGS } from '@kbn/serverless-search-settings';
import { registerApiKeyRoutes } from './routes/api_key_routes';
import { registerIndicesRoutes } from './routes/indices_routes';

import type { ServerlessSearchConfig } from './config';
import type {
  ServerlessSearchPluginSetup,
  ServerlessSearchPluginStart,
  SetupDependencies,
  StartDependencies,
} from './types';
import { registerConnectorsRoutes } from './routes/connectors_routes';

export interface RouteDependencies {
  http: CoreSetup<StartDependencies>['http'];
  logger: Logger;
  router: IRouter;
  security: SecurityPluginStart;
}

export class ServerlessSearchPlugin
  implements
    Plugin<
      ServerlessSearchPluginSetup,
      ServerlessSearchPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  // @ts-ignore config is not used for now
  private readonly config: ServerlessSearchConfig;
  private readonly logger: Logger;
  private security?: SecurityPluginStart;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ServerlessSearchConfig>();
    this.logger = initializerContext.logger.get();
  }

  public setup(
    { getStartServices, http }: CoreSetup<StartDependencies>,
    pluginsSetup: SetupDependencies
  ) {
    const router = http.createRouter();
    getStartServices().then(([, { security }]) => {
      this.security = security;
      const dependencies = {
        http,
        logger: this.logger,
        router,
        security: this.security,
      };

      registerApiKeyRoutes(dependencies);
      registerConnectorsRoutes(dependencies);
      registerIndicesRoutes(dependencies);
    });

    pluginsSetup.serverless.setupProjectSettings(SEARCH_PROJECT_SETTINGS);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
