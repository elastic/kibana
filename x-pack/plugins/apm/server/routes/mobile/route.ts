/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { getMobileFilters } from './get_mobile_filters';

const mobileFilters = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/mobile/filters',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      t.type({ transactionType: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    mobileFilters: Awaited<ReturnType<typeof getMobileFilters>>;
  }> => {
    const [setup, apmEventClient] = await Promise.all([
      setupRequest(resources),
      getApmEventClient(resources),
    ]);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, transactionType } = params.query;
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config: setup.config,
      kuery,
      start,
      end,
    });
    const filters = await getMobileFilters({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
      searchAggregatedTransactions,
      transactionType,
    });
    return { mobileFilters: filters };
  },
});

export const mobileRouteRepository = {
  ...mobileFilters,
};
