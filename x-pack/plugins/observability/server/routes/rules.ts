/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createObservabilityServerRoute } from './create_observability_server_route';
import { createObservabilityServerRouteRepository } from './create_observability_server_route_repository';

const alertsDynamicIndexPatternRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/rules/alerts/dynamic_index_pattern',
  options: {
    tags: [],
  },
  params: t.type({
    query: t.type({
      registrationContexts: t.array(t.string),
    }),
  }),
  handler: async ({ ruleDataService, ruleDataClient, params }) => {
    const { registrationContexts } = params.query;

    const indexNames = registrationContexts.map((registrationContext) =>
      ruleDataService.getBaseNameByRegistrationContext(registrationContext)
    );
    const reader = ruleDataClient.getReader({
      indexNames: indexNames.filter<string>((item: string | undefined): item is string => !!item),
    });

    return reader.getDynamicIndexPattern();
  },
});

export const rulesRouteRepository = createObservabilityServerRouteRepository().add(
  alertsDynamicIndexPatternRoute
);
