/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { EcsDataQualityDashboardPluginSetup, EcsDataQualityDashboardPluginStart } from './types';
import {
  getILMExplainRoute,
  getIndexMappingsRoute,
  getIndexStatsRoute,
  getUnallowedFieldValuesRoute,
} from './routes';

export class EcsDataQualityDashboardPlugin
  implements Plugin<EcsDataQualityDashboardPluginSetup, EcsDataQualityDashboardPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('ecsDataQualityDashboard: Setup'); // this would be deleted when plugin is removed
    const router = core.http.createRouter(); // this would be deleted when plugin is removed

    // Register server side APIs
    getIndexMappingsRoute(router);
    getIndexStatsRoute(router);
    getUnallowedFieldValuesRoute(router);
    getILMExplainRoute(router);
    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('ecsDataQualityDashboard: Started');
    return {};
  }

  public stop() {}
}
