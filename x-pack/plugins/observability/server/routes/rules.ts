/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { createObservabilityServerRoute } from './create_observability_server_route';

const alertsDynamicIndexPatternRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/rules/alerts/dynamic_index_pattern',
  options: {
    tags: [],
  },
  params: t.type({
    query: t.type({
      registrationContexts: t.array(t.string),
      namespace: t.string,
    }),
  }),
  handler: async ({ ruleDataService, params }) => {
    const { namespace, registrationContexts } = params.query;
    const indexNames = registrationContexts.flatMap((registrationContext) => {
      const indexName = ruleDataService
        .findIndexByName(registrationContext, Dataset.alerts)
        ?.getPrimaryAlias(namespace);

      if (indexName != null) {
        return [indexName];
      } else {
        return [];
      }
    });

    return indexNames;
  },
});

export const rulesRouteRepository = alertsDynamicIndexPatternRoute;
