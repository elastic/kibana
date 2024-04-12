/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { ConfigType } from '../../../../config';
import { riskScorePreviewRoute } from './preview';
import { riskScoreCalculationRoute } from './calculation';

export const registerRiskScoreRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  config: ConfigType
) => {
  if (config.experimentalFeatures.riskScoringRoutesEnabled) {
    riskScorePreviewRoute(router, logger);
    riskScoreCalculationRoute(router, logger);
  }
};
