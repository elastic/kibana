/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTrace } from '../lib/traces/get_trace';
import { getTransactionGroupList } from '../lib/transaction_groups';
import { createRoute } from './create_route';
import { environmentRt, rangeRt, uiFiltersRt } from './default_api_types';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { getRootTransactionByTraceId } from '../lib/transactions/get_transaction_by_trace';

export const tracesRoute = createRoute({
  endpoint: 'GET /api/apm/traces',
  params: t.type({
    query: t.intersection([environmentRt, rangeRt, uiFiltersRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { environment } = context.params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getTransactionGroupList(
      { environment, type: 'top_traces', searchAggregatedTransactions },
      setup
    );
  },
});

export const tracesByIdRoute = createRoute({
  endpoint: 'GET /api/apm/traces/{traceId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return getTrace(context.params.path.traceId, setup);
  },
});

export const rootTransactionByTraceIdRoute = createRoute({
  endpoint: 'GET /api/apm/traces/{traceId}/root_transaction',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const { traceId } = context.params.path;
    const setup = await setupRequest(context, request);
    return getRootTransactionByTraceId(traceId, setup);
  },
});
