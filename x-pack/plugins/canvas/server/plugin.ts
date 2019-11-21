/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginInitializerContext, Plugin, Logger } from 'src/core/server';
import { initRoutes } from './routes';

export class CanvasPlugin implements Plugin {
  private readonly logger: Logger;
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(coreSetup: CoreSetup): void {
    const canvasRouter = coreSetup.http.createRouter();

    initRoutes({ router: canvasRouter, logger: this.logger });
  }

  public start() {}

  public stop() {}
}
