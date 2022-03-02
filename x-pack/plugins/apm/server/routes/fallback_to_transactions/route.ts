/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getIsUsingTransactionEvents } from '../../lib/helpers/transactions/get_is_using_transaction_events';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { kueryRt, rangeRt } from '../default_api_types';

const fallbackToTransactionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/fallback_to_transactions',
  params: t.partial({
    query: t.intersection([kueryRt, t.partial(rangeRt.props)]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ fallbackToTransactions: boolean }> => {
    const setup = await setupRequest(resources);
    const {
      params: {
        query: { kuery, start, end },
      },
    } = resources;
    return {
      fallbackToTransactions: await getIsUsingTransactionEvents({
        setup,
        kuery,
        start,
        end,
      }),
    };
  },
});

export const fallbackToTransactionsRouteRepository =
  fallbackToTransactionsRoute;
