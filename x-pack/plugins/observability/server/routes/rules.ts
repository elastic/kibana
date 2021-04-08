/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isoToEpochRt } from '@kbn/io-ts-utils';
import Boom from '@hapi/boom';
import { createObservabilityServerRoute } from './create_observability_server_route';
import { createObservabilityServerRouteRepository } from './create_observability_server_route_repository';
import { getTopAlerts } from '../lib/rules/get_top_alerts';

const alertsListRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/rules/alerts',
  options: {
    tags: [],
  },
  params: t.type({
    query: t.intersection([
      t.type({
        start: isoToEpochRt,
        end: isoToEpochRt,
      }),
      t.partial({
        kuery: t.string,
      }),
    ]),
  }),
  handler: async ({ ruleRegistry, context, params }) => {
    const ruleRegistryClient = ruleRegistry.createScopedRuleRegistryClient({
      context,
    });

    if (!ruleRegistryClient) {
      throw Boom.failedDependency();
    }

    const {
      query: { start, end, kuery },
    } = params;

    return getTopAlerts({
      ruleRegistryClient,
      start,
      end,
      kuery,
      size: 100,
    });
  },
});

export const rulesRouteRepository = createObservabilityServerRouteRepository().add(alertsListRoute);
