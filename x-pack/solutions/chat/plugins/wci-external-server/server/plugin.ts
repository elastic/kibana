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
  WCIExternalServerPluginStart,
  WCIExternalServerPluginSetup,
  WCIExternalServerPluginSetupDependencies,
  WCIExternalServerPluginStartDependencies,
} from './types';
import { getExternalServerIntegrationDefinition } from './integration';

export class WCIExternalServerPlugin
  implements
    Plugin<
      WCIExternalServerPluginSetup,
      WCIExternalServerPluginStart,
      WCIExternalServerPluginSetupDependencies,
      WCIExternalServerPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup,
    { workchatApp }: WCIExternalServerPluginSetupDependencies
  ): WCIExternalServerPluginSetup {
    workchatApp.integrations.register(
      getExternalServerIntegrationDefinition({
        core,
        logger: this.logger,
      })
    );

    return {};
  }

  public start(
    core: CoreStart,
    pluginsDependencies: WCIExternalServerPluginStartDependencies
  ): WCIExternalServerPluginStart {
    return {};
  }
}
