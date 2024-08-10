/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { createUsePipelineSimulatorHook } from './hooks/use_pipeline_simulator';
import { createUseRecommendationsHook } from './hooks/use_recommendations';
import { RecommendationsService } from './services/recommendations';
import {
  LogsOptimizationAppMountParameters,
  LogsOptimizationClientPluginClass,
  LogsOptimizationPublicSetupDeps,
  LogsOptimizationPublicStart,
  LogsOptimizationPublicStartDeps,
} from './types';

export class LogsOptimizationPlugin implements LogsOptimizationClientPluginClass {
  private recommendations: RecommendationsService;

  constructor() {
    this.recommendations = new RecommendationsService();
  }

  public setup(
    core: CoreSetup<LogsOptimizationPublicStartDeps, LogsOptimizationPublicStart>,
    _pluginsSetup: LogsOptimizationPublicSetupDeps
  ) {
    this.recommendations.setup();

    core.application.register({
      id: 'logs-optimization',
      title: 'Logs optimization',
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoLogging',
      visibleIn: [],
      keywords: [],
      mount: async (appParams: LogsOptimizationAppMountParameters) => {
        const [coreStart, pluginsStart, ownPluginStart] = await core.getStartServices();
        const { renderRecommendationsApp } = await import('./applications/logs_optimization_app');

        return renderRecommendationsApp(coreStart, pluginsStart, ownPluginStart, appParams);
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    const { http } = core;

    const recommendationsService = this.recommendations.start({ http });

    const useRecommendations = createUseRecommendationsHook({ recommendationsService });
    const usePipelineSimulator = createUsePipelineSimulatorHook({ recommendationsService });

    return {
      recommendations: recommendationsService,
      useRecommendations,
      usePipelineSimulator,
    };
  }
}
