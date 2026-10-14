/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { routeDefinitions, type FallbackToTransactionsResponse } from '@kbn/apm-api-shared';
import { getIsUsingTransactionEvents } from '../../lib/helpers/transactions/get_is_using_transaction_events';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const fallbackToTransactionsRoute = createApmServerRoute({
  endpoint: routeDefinitions.fallbackToTransactions.fallbackToTransactions.endpoint,
  params: routeDefinitions.fallbackToTransactions.fallbackToTransactions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<FallbackToTransactionsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const {
      config,
      params: {
        query: { kuery, start, end },
      },
    } = resources;
    return {
      fallbackToTransactions: await getIsUsingTransactionEvents({
        config,
        apmEventClient,
        kuery,
        start,
        end,
      }),
    };
  },
});

export const fallbackToTransactionsRouteRepository = fallbackToTransactionsRoute;
