/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { nonEmptyStringRt } from '@kbn/io-ts-utils';
import { TraceSearchType } from '../../../common/trace_explorer';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  environmentRt,
  kueryRt,
  probabilityRt,
  rangeRt,
} from '../default_api_types';
import { getTransaction } from '../transactions/get_transaction';
import { getRootTransactionByTraceId } from '../transactions/get_transaction_by_trace';
import { getTopTracesPrimaryStats } from './get_top_traces_primary_stats';
import { getTraceItems, TraceItems } from './get_trace_items';
import { getTraceSamplesByQuery } from './get_trace_samples_by_query';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import {
  CriticalPathResponse,
  getAggregatedCriticalPath,
} from './get_aggregated_critical_path';
import { getSpan } from '../transactions/get_span';

const tracesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt, probabilityRt]),
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
    const {
      config,
      params,
      request,
      plugins: { security },
    } = resources;

    const { environment, kuery, start, end, probability } = params.query;

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      kuery,
      start,
      end,
    });

    return await getTopTracesPrimaryStats({
      environment,
      kuery,
      apmEventClient,
      searchAggregatedTransactions,
      start,
      end,
      randomSampler,
    });
  },
});

const tracesByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: t.intersection([rangeRt, t.type({ entryTransactionId: t.string })]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    traceItems: TraceItems;
    entryTransaction?: import('./../../../typings/es_schemas/ui/transaction').Transaction;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;
    const { traceId } = params.path;
    const { start, end, entryTransactionId } = params.query;
    const [traceItems, entryTransaction] = await Promise.all([
      getTraceItems(traceId, config, apmEventClient, start, end),
      getTransaction({
        transactionId: entryTransactionId,
        traceId,
        apmEventClient,
      }),
    ]);
    return {
      traceItems,
      entryTransaction,
    };
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
    const apmEventClient = await getApmEventClient(resources);
    return getRootTransactionByTraceId(traceId, apmEventClient);
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
    const apmEventClient = await getApmEventClient(resources);
    return {
      transaction: await getTransaction({ transactionId, apmEventClient }),
    };
  },
});

const findTracesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/find',
  params: t.type({
    query: t.intersection([
      rangeRt,
      environmentRt,
      t.type({
        query: t.string,
        type: t.union([
          t.literal(TraceSearchType.kql),
          t.literal(TraceSearchType.eql),
        ]),
      }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    traceSamples: Array<{ traceId: string; transactionId: string }>;
  }> => {
    const { start, end, environment, query, type } = resources.params.query;

    const apmEventClient = await getApmEventClient(resources);

    return {
      traceSamples: await getTraceSamplesByQuery({
        apmEventClient,
        start,
        end,
        environment,
        query,
        type,
      }),
    };
  },
});

const aggregatedCriticalPathRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/traces/aggregated_critical_path',
  params: t.type({
    body: t.intersection([
      t.type({
        traceIds: t.array(t.string),
        serviceName: t.union([nonEmptyStringRt, t.null]),
        transactionName: t.union([nonEmptyStringRt, t.null]),
      }),
      rangeRt,
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ criticalPath: CriticalPathResponse | null }> => {
    const {
      params: {
        body: { traceIds, start, end, serviceName, transactionName },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);

    return getAggregatedCriticalPath({
      traceIds,
      start,
      end,
      apmEventClient,
      serviceName,
      transactionName,
      logger: resources.logger,
    });
  },
});

const transactionFromTraceByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/transactions/{transactionId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      transactionId: t.string,
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<
    import('./../../../typings/es_schemas/ui/transaction').Transaction
  > => {
    const { params } = resources;
    const { transactionId, traceId } = params.path;
    const apmEventClient = await getApmEventClient(resources);
    return await getTransaction({
      transactionId,
      traceId,
      apmEventClient,
    });
  },
});

const spanFromTraceByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/spans/{spanId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: t.union([t.partial({ parentTransactionId: t.string }), t.undefined]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    span?: import('./../../../typings/es_schemas/ui/span').Span;
    parentTransaction?: import('./../../../typings/es_schemas/ui/transaction').Transaction;
  }> => {
    const { params } = resources;
    const { spanId, traceId } = params.path;
    const { parentTransactionId } = params.query;
    const apmEventClient = await getApmEventClient(resources);
    return await getSpan({
      spanId,
      parentTransactionId,
      traceId,
      apmEventClient,
    });
  },
});

export const traceRouteRepository = {
  ...tracesByIdRoute,
  ...tracesRoute,
  ...rootTransactionByTraceIdRoute,
  ...transactionByIdRoute,
  ...findTracesRoute,
  ...aggregatedCriticalPathRoute,
  ...transactionFromTraceByIdRoute,
  ...spanFromTraceByIdRoute,
};
