/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { AIOPS_ENABLED } from '../common';

import { AiopsPluginSetup, AiopsPluginStart } from './types';
import { defineExampleStreamRoute, defineExplainLogRateSpikesRoute } from './routes';

export class AiopsPlugin implements Plugin<AiopsPluginSetup, AiopsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('aiops: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    if (AIOPS_ENABLED) {
      defineExampleStreamRoute(router, this.logger);
      defineExplainLogRateSpikesRoute(router, this.logger);
    }

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('aiops: Started');
    return {};
  }

  public stop() {}
}
