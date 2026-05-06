/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { type ErrorsByTraceId, type UnifiedSpanDocument } from '@kbn/apm-types';
import {
  routeDefinitions,
  type UnifiedTracesByIdResponse,
  type UnifiedTracesByIdSummaryResponse,
  type UnifiedTracesRootSpanResponse,
  type RootTransactionByTraceIdResponse,
  type TransactionByNameResponse,
  type TransactionByIdResponse,
} from '@kbn/apm-api-shared';
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
import { getRootTransactionByTraceId } from '../transactions/get_transaction_by_trace';
import { buildFocusedTraceItems, findRootItem } from './build_focused_trace_items';
import type { TopTracesPrimaryStatsResponse } from './get_top_traces_primary_stats';
import { getTopTracesPrimaryStats } from './get_top_traces_primary_stats';
import { getTraceSummaryCount } from './get_trace_summary_count';
import { getUnifiedTraceItems } from './get_unified_trace_items';
import { getUnifiedTraceErrors } from './get_unified_trace_errors';
import { createLogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import { getUnifiedTraceSpan } from './get_unified_trace_span';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  TRANSACTION_DURATION,
  SPAN_DURATION,
  DURATION,
  SPAN_ID,
} from '../../../common/es_fields/apm';
import { parseOtelDuration } from '../../lib/helpers/parse_otel_duration';

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

const unifiedTracesByIdRoute = createApmServerRoute({
  endpoint: routeDefinitions.traces.unifiedTracesById.endpoint,
  params: routeDefinitions.traces.unifiedTracesById.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<UnifiedTracesByIdResponse> => {
    const [apmEventClient, logsClient] = await Promise.all([
      getApmEventClient(resources),
      createLogsClient(resources),
    ]);

    const { params, config } = resources;
    const { traceId } = params.path;
    const { start, end, serviceName, entryTransactionId, ecsOnly } = params.query;
    const maxTraceItems = config.ui.maxTraceItems;

    const [{ traceItems, agentMarks, unifiedTraceErrors, traceDocsTotal }, entryTransaction] =
      await Promise.all([
        getUnifiedTraceItems({
          apmEventClient,
          logsClient,
          traceId,
          start,
          end,
          maxTraceItems,
          serviceName,
          ecsOnly: ecsOnly ?? false,
        }),
        entryTransactionId
          ? getTransaction({
              transactionId: entryTransactionId,
              traceId,
              apmEventClient,
              start,
              end,
            })
          : Promise.resolve(undefined),
      ]);

    return {
      traceItems,
      // For now we, we only return apm errors to show as marks in the waterfall
      errors: unifiedTraceErrors.apmErrors,
      agentMarks,
      entryTransaction,
      traceDocsTotal,
      maxTraceItems,
    };
  },
});

const unifiedTracesByIdSummaryRoute = createApmServerRoute({
  endpoint: routeDefinitions.traces.unifiedTracesByIdSummary.endpoint,
  params: routeDefinitions.traces.unifiedTracesByIdSummary.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<UnifiedTracesByIdSummaryResponse> => {
    const [apmEventClient, logsClient] = await Promise.all([
      getApmEventClient(resources),
      createLogsClient(resources),
    ]);

    const { params, config } = resources;
    const { traceId } = params.path;
    const { start, end, docId } = params.query;

    const maxTraceItems = params.query.maxTraceItems ?? config.ui.maxTraceItems;

    const [{ traceItems, unifiedTraceErrors }, traceSummaryCount] = await Promise.all([
      getUnifiedTraceItems({
        apmEventClient,
        logsClient,
        traceId,
        start,
        end,
        maxTraceItems,
      }),
      getTraceSummaryCount({ apmEventClient, start, end, traceId }),
    ]);

    const focusedDocId = docId ?? findRootItem(traceItems)?.id;
    const focusedTraceItems = focusedDocId
      ? buildFocusedTraceItems({ traceItems, docId: focusedDocId })
      : undefined;

    return {
      traceItems: focusedTraceItems,
      summary: { ...traceSummaryCount, errors: unifiedTraceErrors.totalErrors },
    };
  },
});

const unifiedTracesByIdErrorsRoute = createApmServerRoute({
  endpoint: routeDefinitions.traces.unifiedTracesByIdErrors.endpoint,
  params: routeDefinitions.traces.unifiedTracesByIdErrors.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ErrorsByTraceId> => {
    const [apmEventClient, logsClient] = await Promise.all([
      getApmEventClient(resources),
      createLogsClient(resources),
    ]);

    const { params } = resources;
    const { traceId } = params.path;
    const { start, end, docId } = params.query;

    const { apmErrors, unprocessedOtelErrors } = await getUnifiedTraceErrors({
      apmEventClient,
      logsClient,
      docId,
      traceId,
      start,
      end,
    });

    if (apmErrors.length > 0) {
      return { traceErrors: apmErrors, source: 'apm' };
    }

    return { traceErrors: unprocessedOtelErrors, source: 'unprocessedOtel' };
  },
});

const rootTransactionByTraceIdRoute = createApmServerRoute({
  endpoint: routeDefinitions.traces.rootTransactionByTraceId.endpoint,
  params: routeDefinitions.traces.rootTransactionByTraceId.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<RootTransactionByTraceIdResponse> => {
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

const rootItemByTraceIdRoute = createApmServerRoute({
  endpoint: routeDefinitions.traces.unifiedTracesRootSpan.endpoint,
  params: routeDefinitions.traces.unifiedTracesRootSpan.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<UnifiedTracesRootSpanResponse | undefined> => {
    const {
      params: {
        path: { traceId },
        query: { start, end },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);
    const optionalFields = asMutableArray([
      TRANSACTION_DURATION,
      SPAN_DURATION,
      DURATION,
      SPAN_ID,
    ] as const);

    const span = await getUnifiedTraceSpan({
      traceId,
      apmEventClient,
      start,
      end,
      fields: optionalFields,
    });

    if (!span) {
      return undefined;
    }

    const apmDuration = span.transaction?.duration?.us ?? span.span?.duration?.us;
    const otelDuration = span.duration;

    const duration = apmDuration ?? parseOtelDuration(otelDuration);

    if (duration === undefined) {
      return undefined;
    }

    return {
      duration,
    };
  },
});

const transactionByIdRoute = createApmServerRoute({
  endpoint: routeDefinitions.traces.transactionById.endpoint,
  params: routeDefinitions.traces.transactionById.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TransactionByIdResponse> => {
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
  endpoint: routeDefinitions.traces.transactionByName.endpoint,
  params: routeDefinitions.traces.transactionByName.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TransactionByNameResponse> => {
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

const unifiedTraceSpanRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}/spans/{spanId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: rangeRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<UnifiedSpanDocument | undefined> => {
    const {
      params: {
        path: { traceId, spanId },
        query: { start, end },
      },
    } = resources;

    const apmEventClient = await getApmEventClient(resources);

    return getUnifiedTraceSpan({ spanId, traceId, apmEventClient, start, end });
  },
});

export const traceRouteRepository = {
  ...unifiedTracesByIdRoute,
  ...tracesRoute,
  ...rootTransactionByTraceIdRoute,
  ...rootItemByTraceIdRoute,
  ...transactionByIdRoute,
  ...transactionFromTraceByIdRoute,
  ...spanFromTraceByIdRoute,
  ...transactionByNameRoute,
  ...unifiedTracesByIdSummaryRoute,
  ...unifiedTracesByIdErrorsRoute,
  ...unifiedTraceSpanRoute,
};
