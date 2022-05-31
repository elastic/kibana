/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import { registerRoutes } from './routes';

export class ThreatIntelligencePlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('Setup');
    const router = core.http.createRouter<DataRequestHandlerContext>();

    core.getStartServices().then(([_, _depsStart]) => {
      registerRoutes(router);
    });

    return {};
  }

  public start(_core: CoreStart) {
    this.logger.debug('Started');
    return {};
  }

  public stop() {}
}
