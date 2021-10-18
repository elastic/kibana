/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { getOverallLatencyDistribution } from '../lib/latency/get_overall_latency_distribution';
import { setupRequest } from '../lib/helpers/setup_request';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { environmentRt, kueryRt, rangeRt } from './default_api_types';

const latencyOverallDistributionRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/latency/overall_distribution',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({
        percentileThreshold: toNumberRt,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const {
      environment,
      kuery,
      serviceName,
      transactionType,
      transactionName,
      start,
      end,
      percentileThreshold,
    } = resources.params.query;

    return getOverallLatencyDistribution({
      environment,
      kuery,
      serviceName,
      transactionType,
      transactionName,
      start,
      end,
      percentileThreshold,
      setup,
    });
  },
});

export const latencyDistributionRouteRepository =
  createApmServerRouteRepository().add(latencyOverallDistributionRoute);
