/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, Logger, PluginInitializerContext } from '@kbn/core/server';
import { defineRoutes } from './routes';

export class TestPlugin implements Plugin<void, void, {}, {}> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('fixtures', 'plugins', 'alerts');
  }

  public setup(core: CoreSetup) {
    defineRoutes(core, this.logger);
  }

  public start() {}
  public stop() {}
}
