/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceCount } from '../lib/observability_overview/get_service_count';
import { getTransactionsPerMinute } from '../lib/observability_overview/get_transactions_per_minute';
import { getHasData } from '../lib/observability_overview/has_data';
import { rangeRt } from './default_api_types';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { withApmSpan } from '../utils/with_apm_span';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { createApmServerRoute } from './create_apm_server_route';

const observabilityOverviewHasDataRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/observability_overview/has_data',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    return await getHasData({ setup });
  },
});

const observabilityOverviewRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/observability_overview',
  params: t.type({
    query: t.intersection([rangeRt, t.type({ bucketSize: t.string })]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { bucketSize, start, end } = resources.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      start,
      end,
      kuery: '',
    });

    return withApmSpan('observability_overview', async () => {
      const [serviceCount, transactionPerMinute] = await Promise.all([
        getServiceCount({
          setup,
          searchAggregatedTransactions,
          start,
          end,
        }),
        getTransactionsPerMinute({
          setup,
          bucketSize,
          searchAggregatedTransactions,
          start,
          end,
        }),
      ]);
      return { serviceCount, transactionPerMinute };
    });
  },
});

export const observabilityOverviewRouteRepository =
  createApmServerRouteRepository()
    .add(observabilityOverviewRoute)
    .add(observabilityOverviewHasDataRoute);
