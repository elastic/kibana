/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTraceItems } from '../lib/traces/get_trace_items';
import { getTopTransactionGroupList } from '../lib/transaction_groups';
import { createApmServerRoute } from './create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from './default_api_types';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { getRootTransactionByTraceId } from '../lib/transactions/get_transaction_by_trace';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { getTransaction } from '../lib/transactions/get_transaction';

const tracesRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/traces',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { environment, kuery, start, end } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

    return getTopTransactionGroupList(
      { environment, kuery, searchAggregatedTransactions, start, end },
      setup
    );
  },
});

const tracesByIdRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/traces/{traceId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { traceId } = params.path;
    const { start, end } = params.query;

    return getTraceItems(traceId, setup, start, end);
  },
});

const rootTransactionByTraceIdRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/traces/{traceId}/root_transaction',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { params } = resources;
    const { traceId } = params.path;
    const setup = await setupRequest(resources);
    return getRootTransactionByTraceId(traceId, setup);
  },
});

const transactionByIdRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/transactions/{transactionId}',
  params: t.type({
    path: t.type({
      transactionId: t.string,
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { params } = resources;
    const { transactionId } = params.path;
    const setup = await setupRequest(resources);
    return {
      transaction: await getTransaction({ transactionId, setup }),
    };
  },
});

export const traceRouteRepository = createApmServerRouteRepository()
  .add(tracesByIdRoute)
  .add(tracesRoute)
  .add(rootTransactionByTraceIdRoute)
  .add(transactionByIdRoute);
