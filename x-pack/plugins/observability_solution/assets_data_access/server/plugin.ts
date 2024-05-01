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
import { AssetsPluginStartDeps } from './types';

export type AssetsDataAccessPluginSetup = ReturnType<AssetsDataAccessPlugin['setup']>;
export type AssetsDataAccessPluginStart = ReturnType<AssetsDataAccessPlugin['start']>;

export class AssetsDataAccessPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }
  public setup(core: CoreSetup) {}

  public start(core: CoreStart, plugins: AssetsPluginStartDeps) {
    const services = registerServices({
      logger: this.logger,
      deps: {},
    });

    return { services };
  }
}
