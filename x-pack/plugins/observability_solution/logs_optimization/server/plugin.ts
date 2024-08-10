/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';

import {
  LogsOptimizationPluginCoreSetup,
  LogsOptimizationServerSetup,
  LogsOptimizationServerStart,
  LogsOptimizationServerPluginSetupDeps,
  LogsOptimizationServerPluginStartDeps,
} from './types';

import { LogsOptimizationBackendLibs } from './lib/shared_types';
import { initLogsOptimizationServer } from './logs_optimization_server';
import { DetectionsService } from './services/detections';
import { RecommendationsService } from './services/recommendations';

export class LogsOptimizationPlugin
  implements
    Plugin<
      LogsOptimizationServerSetup,
      LogsOptimizationServerStart,
      LogsOptimizationServerPluginSetupDeps,
      LogsOptimizationServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  private libs!: LogsOptimizationBackendLibs;
  private detectionsService: DetectionsService;
  private recommendationsService: RecommendationsService;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.detectionsService = new DetectionsService(this.logger);
    this.recommendationsService = new RecommendationsService(this.logger);
  }

  public setup(
    core: LogsOptimizationPluginCoreSetup,
    plugins: LogsOptimizationServerPluginSetupDeps
  ) {
    const detectionsService = this.detectionsService.setup({
      getStartServices: core.getStartServices,
    });

    const recommendationsService = this.recommendationsService.setup({
      getStartServices: core.getStartServices,
    });

    this.libs = {
      getStartServices: core.getStartServices,
      logger: this.logger,
      plugins,
      router: core.http.createRouter(),
    };

    // Register server side APIs
    initLogsOptimizationServer(this.libs);

    return {
      detectionsService,
      recommendationsService,
    };
  }

  public start(core: CoreStart, plugins: LogsOptimizationServerPluginStartDeps) {
    const detectionsService = this.detectionsService.start({
      fieldsMetadata: plugins.fieldsMetadata,
    });

    const recommendationsService = this.recommendationsService.start({ detectionsService });

    return { detectionsService, recommendationsService };
  }
}
