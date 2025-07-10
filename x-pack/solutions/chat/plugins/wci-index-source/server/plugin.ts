/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import type {
  WCIIndexSourcePluginStart,
  WCIIndexSourcePluginSetup,
  WCIIndexSourcePluginSetupDependencies,
  WCIIndexSourcePluginStartDependencies,
} from './types';
import { registerRoutes } from './routes';
import { getIndexSourceIntegrationDefinition } from './integration';

export class WCIIndexSourcePlugin
  implements
    Plugin<
      WCIIndexSourcePluginSetup,
      WCIIndexSourcePluginStart,
      WCIIndexSourcePluginSetupDependencies,
      WCIIndexSourcePluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup<WCIIndexSourcePluginStartDependencies>,
    { workchatApp }: WCIIndexSourcePluginSetupDependencies
  ): WCIIndexSourcePluginSetup {
    const router = core.http.createRouter();
    registerRoutes({
      core,
      logger: this.logger,
      router,
    });

    workchatApp.integrations.register(
      getIndexSourceIntegrationDefinition({
        core,
        logger: this.logger,
      })
    );

    return {};
  }

  public start(
    core: CoreStart,
    pluginsDependencies: WCIIndexSourcePluginStartDependencies
  ): WCIIndexSourcePluginStart {
    return {};
  }
}
