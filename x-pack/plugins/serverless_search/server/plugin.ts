/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger, PluginInitializerContext, Plugin, CoreSetup } from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { registerApiKeyRoutes } from './routes/api_key_routes';

import { ServerlessSearchConfig } from './config';
import { ServerlessSearchPluginSetup, ServerlessSearchPluginStart } from './types';

interface StartDependencies {
  security: SecurityPluginStart;
}
export interface RouteDependencies {
  logger: Logger;
  router: IRouter;
  security: SecurityPluginStart;
}

export class ServerlessSearchPlugin
  implements Plugin<ServerlessSearchPluginSetup, ServerlessSearchPluginStart>
{
  // @ts-ignore config is not used for now
  private readonly config: ServerlessSearchConfig;
  private readonly logger: Logger;
  private security?: SecurityPluginStart;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ServerlessSearchConfig>();
    this.logger = initializerContext.logger.get();
  }

  public setup({ getStartServices, http }: CoreSetup<StartDependencies>) {
    const router = http.createRouter();
    getStartServices().then(([, { security }]) => {
      this.security = security;
      const dependencies = { logger: this.logger, router, security: this.security };

      registerApiKeyRoutes(dependencies);
    });
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
