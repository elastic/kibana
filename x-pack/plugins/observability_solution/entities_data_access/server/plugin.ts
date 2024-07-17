/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerServices } from './services/register_services';
import { EntitiesPluginSetupDeps, EntitiesPluginStartDeps } from './types';

export type EntitiesDataAccessPluginSetup = ReturnType<EntitiesDataAccessPlugin['setup']>;
export type EntitiesDataAccessPluginStart = ReturnType<EntitiesDataAccessPlugin['start']>;

export class EntitiesDataAccessPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: EntitiesPluginSetupDeps) {}

  public start(core: CoreStart, plugins: EntitiesPluginStartDeps) {
    const services = registerServices({
      logger: this.logger,
      deps: {},
    });

    return { services };
  }
}
