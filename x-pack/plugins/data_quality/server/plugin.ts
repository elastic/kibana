/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { DataQualityPluginSetup, DataQualityPluginStart } from './types';
import { getIndexMappingsRoute, getIndexStatsRoute } from './routes';

export class DataQualityPlugin implements Plugin<DataQualityPluginSetup, DataQualityPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('dataQuality: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    getIndexMappingsRoute(router);
    getIndexStatsRoute(router);
    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('dataQuality: Started');
    return {};
  }

  public stop() {}
}
