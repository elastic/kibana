/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { nonEmptyStringRt } from '@kbn/io-ts-utils';
import { TraceSearchType } from '../../../common/trace_explorer';
import { setupRequest } from '../../lib/helpers/setup_request';
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
import { getTraceItems } from './get_trace_items';
import { getTraceSamplesByQuery } from './get_trace_samples_by_query';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import {
  CriticalPathResponse,
  getAggregatedCriticalPath,
} from './get_aggregated_critical_path';

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
      params,
      request,
      plugins: { security },
    } = resources;

    const { environment, kuery, start, end, probability } = params.query;

    const [setup, apmEventClient, randomSampler] = await Promise.all([
      setupRequest(resources),
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config: setup.config,
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
    linkedChildrenOfSpanCountBySpanId: Record<string, number>;
  }> => {
    const [setup, apmEventClient] = await Promise.all([
      setupRequest(resources),
      getApmEventClient(resources),
    ]);
    const { params } = resources;
    const { traceId } = params.path;
    const { start, end } = params.query;
    const { config } = setup;
    return getTraceItems(traceId, config, apmEventClient, start, end);
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
};
