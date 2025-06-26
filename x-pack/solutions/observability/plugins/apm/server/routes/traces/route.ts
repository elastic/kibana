/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import type { TraceItem } from '../../../common/waterfall/unified_trace_item';
import { TraceSearchType } from '../../../common/trace_explorer';
import type { Span } from '../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../typings/es_schemas/ui/transaction';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, probabilityRt, rangeRt } from '../default_api_types';
import { getSpan } from '../transactions/get_span';
import { getTransaction } from '../transactions/get_transaction';
import { getTransactionByName } from '../transactions/get_transaction_by_name';
import {
  getRootTransactionByTraceId,
  type TransactionDetailRedirectInfo,
} from '../transactions/get_transaction_by_trace';
import type { FocusedTraceItems } from './build_focused_trace_items';
import { buildFocusedTraceItems } from './build_focused_trace_items';
import type { TopTracesPrimaryStatsResponse } from './get_top_traces_primary_stats';
import { getTopTracesPrimaryStats } from './get_top_traces_primary_stats';
import type { TraceItems } from './get_trace_items';
import { getTraceItems } from './get_trace_items';
import type { TraceSamplesResponse } from './get_trace_samples_by_query';
import { getTraceSamplesByQuery } from './get_trace_samples_by_query';
import { getTraceSummaryCount } from './get_trace_summary_count';
import { getUnifiedTraceItems } from './get_unified_trace_items';
import { getUnifiedTraceErrors } from './get_unified_trace_errors';

const tracesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt, probabilityRt]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TopTracesPrimaryStatsResponse> => {
    const { config, params, request, core } = resources;

    const { environment, kuery, start, end, probability } = params.query;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability }),
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
    query: t.intersection([
      rangeRt,
      t.type({ entryTransactionId: t.string }),
      t.partial({ maxTraceItems: toNumberRt }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    traceItems: TraceItems;
    entryTransaction?: Transaction;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config, logger } = resources;
    const { traceId } = params.path;
    const { start, end, entryTransactionId } = params.query;
    const [traceItems, entryTransaction] = await Promise.all([
      getTraceItems({
        traceId,
        config,
        apmEventClient,
        start,
        end,
        maxTraceItemsFromUrlParam: params.query.maxTraceItems,
        logger,
      }),
      getTransaction({
        transactionId: entryTransactionId,
        traceId,
        apmEventClient,
        start,
        end,
      }),
    ]);
    return {
      traceItems,
      entryTransaction,
    };
  },
});

const unifiedTracesByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: t.intersection([
      rangeRt,
      t.type({ entryTransactionId: t.string }),
      t.partial({ maxTraceItems: toNumberRt }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    traceItems: TraceItem[];
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;
    const { traceId } = params.path;
    const { start, end } = params.query;

    const unifiedTraceErrors = await getUnifiedTraceErrors({ apmEventClient, traceId, start, end });

    const traceItems = await getUnifiedTraceItems({
      apmEventClient,
      traceId,
      start,
      end,
      maxTraceItemsFromUrlParam: params.query.maxTraceItems,
      config,
      unifiedTraceErrors,
    });

    return {
      traceItems,
    };
  },
});

const focusedTraceRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/{docId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      docId: t.string,
    }),
    query: t.intersection([rangeRt, t.partial({ maxTraceItems: toNumberRt })]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    traceItems?: FocusedTraceItems;
    summary: { services: number; traceEvents: number; errors: number };
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;
    const { traceId, docId } = params.path;
    const { start, end } = params.query;

    const unifiedTraceErrors = await getUnifiedTraceErrors({ apmEventClient, traceId, start, end });

    const [traceItems, traceSummaryCount] = await Promise.all([
      getUnifiedTraceItems({
        apmEventClient,
        traceId,
        start,
        end,
        maxTraceItemsFromUrlParam: params.query.maxTraceItems,
        config,
        unifiedTraceErrors,
      }),
      getTraceSummaryCount({ apmEventClient, start, end, traceId }),
    ]);

    const focusedTraceItems = buildFocusedTraceItems({ traceItems, docId });

    return {
      traceItems: focusedTraceItems,
      summary: { ...traceSummaryCount, errors: unifiedTraceErrors.totalErrors },
    };
  },
});

const rootTransactionByTraceIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/root_transaction',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: rangeRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    transaction?: TransactionDetailRedirectInfo;
  }> => {
    const {
      params: {
        path: { traceId },
        query: { start, end },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);

    return getRootTransactionByTraceId({ traceId, apmEventClient, start, end });
  },
});

const transactionByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/transactions/{transactionId}',
  params: t.type({
    path: t.type({
      transactionId: t.string,
    }),
    query: rangeRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    transaction?: Transaction;
  }> => {
    const {
      params: {
        path: { transactionId },
        query: { start, end },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);
    return {
      transaction: await getTransaction({
        transactionId,
        apmEventClient,
        start,
        end,
      }),
    };
  },
});

const transactionByNameRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/transactions',
  params: t.type({
    query: t.intersection([
      rangeRt,
      t.type({
        transactionName: t.string,
        serviceName: t.string,
      }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    transaction?: TransactionDetailRedirectInfo;
  }> => {
    const {
      params: {
        query: { start, end, transactionName, serviceName },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);
    return {
      transaction: await getTransactionByName({
        transactionName,
        apmEventClient,
        start,
        end,
        serviceName,
      }),
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
        type: t.union([t.literal(TraceSearchType.kql), t.literal(TraceSearchType.eql)]),
      }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    traceSamples: TraceSamplesResponse;
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

const transactionFromTraceByIdRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/traces/{traceId}/transactions/{transactionId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      transactionId: t.string,
    }),
    query: rangeRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<Transaction | undefined> => {
    const { params } = resources;
    const {
      path: { transactionId, traceId },
      query: { start, end },
    } = params;

    const apmEventClient = await getApmEventClient(resources);
    return await getTransaction({
      transactionId,
      traceId,
      apmEventClient,
      start,
      end,
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
    query: t.intersection([
      rangeRt,
      t.union([t.partial({ parentTransactionId: t.string }), t.undefined]),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    span?: Span;
    parentTransaction?: Transaction;
  }> => {
    const { params } = resources;
    const {
      path: { spanId, traceId },
      query: { start, end, parentTransactionId },
    } = params;

    const apmEventClient = await getApmEventClient(resources);
    return await getSpan({
      spanId,
      parentTransactionId,
      traceId,
      apmEventClient,
      start,
      end,
    });
  },
});

export const traceRouteRepository = {
  ...tracesByIdRoute,
  ...unifiedTracesByIdRoute,
  ...tracesRoute,
  ...rootTransactionByTraceIdRoute,
  ...transactionByIdRoute,
  ...findTracesRoute,
  ...transactionFromTraceByIdRoute,
  ...spanFromTraceByIdRoute,
  ...transactionByNameRoute,
  ...focusedTraceRoute,
};
