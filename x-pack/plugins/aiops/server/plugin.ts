/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import { AIOPS_ENABLED } from '../common';

import {
  AiopsPluginSetup,
  AiopsPluginStart,
  AiopsPluginSetupDeps,
  AiopsPluginStartDeps,
} from './types';
import { defineExplainLogRateSpikesRoute } from './routes';

export class AiopsPlugin
  implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<AiopsPluginStartDeps>, deps: AiopsPluginSetupDeps) {
    this.logger.debug('aiops: Setup');
    const router = core.http.createRouter<DataRequestHandlerContext>();

    // Register server side APIs
    if (AIOPS_ENABLED) {
      core.getStartServices().then(([_, depsStart]) => {
        defineExplainLogRateSpikesRoute(router, this.logger);
      });
    }

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('aiops: Started');
    return {};
  }

  public stop() {}
}
