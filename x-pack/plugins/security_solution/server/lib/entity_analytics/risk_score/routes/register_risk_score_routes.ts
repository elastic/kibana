import type { EntityAnalyticsRoutesDeps } from '../../types';
import { riskScoreCalculationRoute } from './calculation';
import { riskScoreEntityCalculationRoute } from './entity_calculation';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { riskScorePreviewRoute } from './preview';

export const registerRiskScoreRoutes = ({
  router,
  getStartServices,
  logger,
}: EntityAnalyticsRoutesDeps) => {
  riskScorePreviewRoute(router, logger);
  riskScoreCalculationRoute(router, logger);
  riskScoreEntityCalculationRoute(router, getStartServices, logger);
};
