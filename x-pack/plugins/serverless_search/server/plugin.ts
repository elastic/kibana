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
import { EnterpriseSearchPluginStart } from '@kbn/enterprise-search-plugin/server';
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
  logger: Logger;
  router: IRouter;
  search: EnterpriseSearchPluginStart;
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
  private enterpriseSearch?: EnterpriseSearchPluginStart;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ServerlessSearchConfig>();
    this.logger = initializerContext.logger.get();
  }

  public setup(
    { getStartServices, http }: CoreSetup<StartDependencies>,
    pluginsSetup: SetupDependencies
  ) {
    const router = http.createRouter();
    getStartServices().then(([, { enterpriseSearch, security }]) => {
      this.security = security;
      this.enterpriseSearch = enterpriseSearch;
      const dependencies = {
        logger: this.logger,
        router,
        search: this.enterpriseSearch,
        security: this.security,
      };

      registerApiKeyRoutes(dependencies);
      registerConnectorsRoutes(dependencies);
      registerIndicesRoutes(dependencies);
    });

    pluginsSetup.ml.setFeaturesEnabled({ ad: false, dfa: false, nlp: true });
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
