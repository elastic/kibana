/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getTraceItems } from './get_trace_items';
import { getTopTracesPrimaryStats } from './get_top_traces_primary_stats';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { getSearchAggregatedTransactions } from '../../lib/helpers/transactions';
import { getRootTransactionByTraceId } from '../transactions/get_transaction_by_trace';
import { getTransaction } from '../transactions/get_transaction';

const tracesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    items: Array<{
      key: import('./get_top_traces_primary_stats').BucketKey;
      serviceName: string;
      transactionName: string;
      averageResponseTime: number | null;
      transactionsPerMinute: number;
      transactionType: string;
      impact: number;
      agentName: import('./../../../typings/es_schemas/ui/fields/agent').AgentName;
    }>;
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { environment, kuery, start, end } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

    return await getTopTracesPrimaryStats({
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      start,
      end,
    });
  },
});

const tracesByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    exceedsMax: boolean;
    traceDocs: Array<
      | import('./../../../typings/es_schemas/ui/transaction').Transaction
      | import('./../../../typings/es_schemas/ui/span').Span
    >;
    errorDocs: Array<
      import('./../../../typings/es_schemas/ui/apm_error').APMError
    >;
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { traceId } = params.path;
    const { start, end } = params.query;

    return getTraceItems(traceId, setup, start, end);
  },
});

const rootTransactionByTraceIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/root_transaction',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    transaction: import('./../../../typings/es_schemas/ui/transaction').Transaction;
  }> => {
    const { params } = resources;
    const { traceId } = params.path;
    const setup = await setupRequest(resources);
    return getRootTransactionByTraceId(traceId, setup);
  },
});

const transactionByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/transactions/{transactionId}',
  params: t.type({
    path: t.type({
      transactionId: t.string,
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    transaction: import('./../../../typings/es_schemas/ui/transaction').Transaction;
  }> => {
    const { params } = resources;
    const { transactionId } = params.path;
    const setup = await setupRequest(resources);
    return {
      transaction: await getTransaction({ transactionId, setup }),
    };
  },
});

export const traceRouteRepository = {
  ...tracesByIdRoute,
  ...tracesRoute,
  ...rootTransactionByTraceIdRoute,
  ...transactionByIdRoute,
};
