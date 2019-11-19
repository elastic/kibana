/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { initRoutes } from './routes';

/**
 * Represents Code Plugin instance that will be managed by the Kibana plugin system.
 */
export class CanvasPlugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(coreSetup: CoreSetup): void {
    this.initializerContext.logger.get().debug('Get Workpad route');
    const canvasRouter = coreSetup.http.createRouter();

    initRoutes({ router: canvasRouter });
  }

  public start() {
    this.initializerContext.logger.get().debug('Starting Canvas plugin');
  }

  public stop() {
    this.initializerContext.logger.get().debug('Stopping Canvas plugin');
  }
}
