/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { observabilityFeatureId } from '../../common';
import { createObservabilityServerRoute } from './create_observability_server_route';
import { createObservabilityServerRouteRepository } from './create_observability_server_route_repository';

const alertsDynamicIndexPatternRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/rules/alerts/dynamic_index_pattern',
  options: {
    tags: [],
  },
  handler: async ({ ruleDataClient }) => {
    const reader = ruleDataClient.getReader({ namespace: observabilityFeatureId });

    return reader.getDynamicIndexPattern();
  },
});

export const rulesRouteRepository = createObservabilityServerRouteRepository().add(
  alertsDynamicIndexPatternRoute
);
