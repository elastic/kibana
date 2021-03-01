/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceCount } from '../lib/observability_overview/get_service_count';
import { getTransactionCoordinates } from '../lib/observability_overview/get_transaction_coordinates';
import { hasData } from '../lib/observability_overview/has_data';
import { createRoute } from './create_route';
import { rangeRt } from './default_api_types';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { withApmSpan } from '../utils/with_apm_span';

export const observabilityOverviewHasDataRoute = createRoute({
  endpoint: 'GET /api/apm/observability_overview/has_data',
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return await hasData({ setup });
  },
});

export const observabilityOverviewRoute = createRoute({
  endpoint: 'GET /api/apm/observability_overview',
  params: t.type({
    query: t.intersection([rangeRt, t.type({ bucketSize: t.string })]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { bucketSize } = context.params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return withApmSpan('observability_overview', async () => {
      const [serviceCount, transactionCoordinates] = await Promise.all([
        getServiceCount({
          setup,
          searchAggregatedTransactions,
        }),
        getTransactionCoordinates({
          setup,
          bucketSize,
          searchAggregatedTransactions,
        }),
      ]);
      return { serviceCount, transactionCoordinates };
    });
  },
});
