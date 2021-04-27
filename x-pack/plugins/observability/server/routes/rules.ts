/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isoToEpochRt, toNumberRt } from '@kbn/io-ts-utils';
import Boom from '@hapi/boom';
import { createObservabilityServerRoute } from './create_observability_server_route';
import { createObservabilityServerRouteRepository } from './create_observability_server_route_repository';
import { getTopAlerts } from '../lib/rules/get_top_alerts';

const alertsListRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/rules/alerts/top',
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
        size: toNumberRt,
      }),
    ]),
  }),
  handler: async ({ ruleRegistry, context, params }) => {
    const ruleRegistryClient = await ruleRegistry.createScopedRuleRegistryClient({
      context,
      alertsClient: context.alerting.getAlertsClient(),
    });

    if (!ruleRegistryClient) {
      throw Boom.failedDependency('xpack.ruleRegistry.unsafe.write.enabled is set to false');
    }

    const {
      query: { start, end, kuery, size = 100 },
    } = params;

    return getTopAlerts({
      ruleRegistryClient,
      start,
      end,
      kuery,
      size,
    });
  },
});

const alertsDynamicIndexPatternRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/rules/alerts/dynamic_index_pattern',
  options: {
    tags: [],
  },
  handler: async ({ ruleRegistry, context }) => {
    const ruleRegistryClient = await ruleRegistry.createScopedRuleRegistryClient({
      context,
      alertsClient: context.alerting.getAlertsClient(),
    });

    if (!ruleRegistryClient) {
      throw Boom.failedDependency();
    }

    return ruleRegistryClient.getDynamicIndexPattern();
  },
});

export const rulesRouteRepository = createObservabilityServerRouteRepository()
  .add(alertsListRoute)
  .add(alertsDynamicIndexPatternRoute);
