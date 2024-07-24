/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { createUseRecommendationsHook } from './hooks/use_recommendations';
import { RecommendationsService } from './services/recommendations';
import { LogsOptimizationClientPluginClass } from './types';

export class LogsOptimizationPlugin implements LogsOptimizationClientPluginClass {
  private recommendations: RecommendationsService;

  constructor() {
    this.recommendations = new RecommendationsService();
  }

  public setup() {
    this.recommendations.setup();

    return {};
  }

  public start(core: CoreStart) {
    const { http } = core;

    const recommendationsService = this.recommendations.start({ http });

    const useRecommendations = createUseRecommendationsHook({ recommendationsService });

    return {
      getClient: recommendationsService.getClient,
      useRecommendations,
    };
  }
}
