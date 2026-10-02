/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type { ConnectionFailedCallsResponse } from '@kbn/apm-api-shared';
import { ATTRIBUTE_RPC_GRPC_STATUS_CODE, RPC_GRPC_STATUS_CODE } from '@kbn/apm-types';
import {
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  EVENT_OUTCOME,
  HTTP_RESPONSE_STATUS_CODE,
  PARENT_ID,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import { EventOutcome } from '../../../common/event_outcome';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { withApmSpan } from '../../utils/with_apm_span';

/**
 * Maximum number of failed span IDs collected.
 * Results may be slightly biased when this cap is hit on very high-error-rate connections.
 */
const MAX_IDS = 1000;

/**
 * Names for gRPC status codes we surface in "Top error" labels.
 * https://grpc.github.io/grpc/core/md_doc_statuscodes.html
 */
const GRPC_CODE_NAMES: Record<number, string> = {
  1: 'CANCELLED',
  2: 'UNKNOWN',
  3: 'INVALID_ARGUMENT',
  4: 'DEADLINE_EXCEEDED',
  5: 'NOT_FOUND',
  7: 'PERMISSION_DENIED',
  8: 'RESOURCE_EXHAUSTED',
  12: 'UNIMPLEMENTED',
  13: 'INTERNAL',
  14: 'UNAVAILABLE',
  16: 'UNAUTHENTICATED',
};

interface FailedSpan {
  spanId: string;
  traceId: string | null;
  httpStatus: number | null;
  grpcCode: number | null;
}

function grpcLabel(code: number): string {
  return `gRPC ${GRPC_CODE_NAMES[code] ?? code}`;
}

interface TopErrorDoc {
  message: string;
  groupId: string;
}

/**
 * Returns a human-readable top-error label and, when the label came from a
 * real APM error document, its error group ID for deep-linking.
 * Priority: APM error doc → HTTP/gRPC status from the span.
 */
function pickTopError({
  errorDoc,
  httpStatuses,
  grpcCodes,
}: {
  errorDoc: TopErrorDoc | null;
  httpStatuses: number[];
  grpcCodes: number[];
}): { topError: string | null; topErrorGroupId: string | null } {
  if (errorDoc) return { topError: errorDoc.message, topErrorGroupId: errorDoc.groupId };
  if (httpStatuses.length > 0)
    return { topError: `HTTP ${httpStatuses[0]}`, topErrorGroupId: null };
  if (grpcCodes.length > 0) return { topError: grpcLabel(grpcCodes[0]), topErrorGroupId: null };
  return { topError: null, topErrorGroupId: null };
}

/**
 * Returns the most-frequent value in an array of numbers (or null if empty).
 * Simple frequency count — acceptable for small arrays (up to MAX_IDS spans).
 */
function mostFrequent(values: number[]): number[] {
  if (values.length === 0) return [];
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code);
}

export function getConnectionFailedCalls({
  apmEventClient,
  sourceServiceName,
  targetServiceName,
  dependencies,
  environment,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  sourceServiceName: string;
  targetServiceName?: string;
  dependencies: string[];
  environment: Environment;
  start: number;
  end: number;
}): Promise<ConnectionFailedCallsResponse> {
  return withApmSpan('get_connection_failed_calls', async () => {
    // -----------------------------------------------------------------------
    // Step 1: collect failed exit spans for this connection.
    // - For s→d edges: source service + resource match.
    // - For s→s edges: source service + resource match (or no resource filter
    //   when dependencies is empty, relying on step 2 to classify via child txns).
    //   Note: we intentionally do NOT do the parent-id join here because we
    //   want *all* failed exit spans, including those that never reached s2
    //   (they won't have a child transaction).
    // -----------------------------------------------------------------------
    // baseScopeFilter: service + resource (no outcome filter) — used for total-calls count.
    // scopeFilter: baseScopeFilter + outcome=failure — used for failed spans.
    const resourceFilter: Array<Record<string, unknown>> =
      dependencies.length > 0
        ? [{ terms: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencies } }]
        : [];

    if (dependencies.length === 0 && !targetServiceName) {
      // Nothing to scope on — shouldn't happen in practice.
      return { buckets: [], totalFailed: 0, totalCalls: 0, isSampled: false };
    }

    const baseScopeFilter: Array<Record<string, unknown>> = [
      { term: { [SERVICE_NAME]: sourceServiceName } },
      ...resourceFilter,
    ];
    const scopeFilter: Array<Record<string, unknown>> = [
      ...baseScopeFilter,
      { term: { [EVENT_OUTCOME]: EventOutcome.failure } },
    ];

    const [failedSpanResponse, totalCallsResponse] = await Promise.all([
      apmEventClient.search('get_connection_failed_calls_failed_spans', {
        apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction] },
        track_total_hits: MAX_IDS + 1,
        size: MAX_IDS,
        _source: false,
        fields: [
          SPAN_ID,
          TRACE_ID,
          HTTP_RESPONSE_STATUS_CODE,
          RPC_GRPC_STATUS_CODE,
          ATTRIBUTE_RPC_GRPC_STATUS_CODE,
        ],
        query: {
          bool: {
            filter: [...scopeFilter, ...rangeQuery(start, end), ...environmentQuery(environment)],
          },
        },
      }),
      apmEventClient.search('get_connection_failed_calls_total_count', {
        apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction] },
        track_total_hits: true,
        size: 0,
        query: {
          bool: {
            filter: [
              ...baseScopeFilter,
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
            ],
          },
        },
      }),
    ]);

    const totalFailed =
      typeof failedSpanResponse.hits.total === 'number'
        ? failedSpanResponse.hits.total
        : failedSpanResponse.hits.total?.value ?? 0;

    const totalCalls =
      typeof totalCallsResponse.hits.total === 'number'
        ? totalCallsResponse.hits.total
        : totalCallsResponse.hits.total?.value ?? 0;

    const isSampled = totalFailed > MAX_IDS;

    const failedSpans: FailedSpan[] = failedSpanResponse.hits.hits.map((hit) => {
      const fields = (hit as any).fields ?? {};
      const httpStatus = (fields[HTTP_RESPONSE_STATUS_CODE]?.[0] as number | undefined) ?? null;
      const grpcCode =
        ((fields[ATTRIBUTE_RPC_GRPC_STATUS_CODE]?.[0] ?? fields[RPC_GRPC_STATUS_CODE]?.[0]) as
          | number
          | undefined) ?? null;
      return {
        spanId: String(fields[SPAN_ID]?.[0] ?? ''),
        traceId: (fields[TRACE_ID]?.[0] as string | undefined) ?? null,
        httpStatus,
        grpcCode,
      };
    });

    if (failedSpans.length === 0) {
      return {
        buckets: [],
        totalFailed: 0,
        totalCalls,
        isSampled: false,
      };
    }

    // -----------------------------------------------------------------------
    // Dependency-only edges: single bucket, no child join possible.
    // -----------------------------------------------------------------------
    if (!targetServiceName) {
      const topErrorDoc = await getTopErrorForSpans({
        apmEventClient,
        serviceName: sourceServiceName,
        spanIds: failedSpans.map((s) => s.spanId),
        environment,
        start,
        end,
      });

      const httpStatuses = mostFrequent(
        failedSpans.map((s) => s.httpStatus).filter((v): v is number => v !== null)
      );
      const grpcCodes = mostFrequent(
        failedSpans.map((s) => s.grpcCode).filter((v): v is number => v !== null)
      );

      return {
        buckets: [
          {
            type: 'dependency',
            count: failedSpans.length,
            sampleTraceId: failedSpans[0]?.traceId ?? null,
            ...pickTopError({ errorDoc: topErrorDoc, httpStatuses, grpcCodes }),
          },
        ],
        totalFailed,
        totalCalls,
        isSampled,
      };
    }

    // -----------------------------------------------------------------------
    // Step 2 (s→s): fetch child transactions from the target service whose
    // parent.id is one of our failed exit span ids. This tells us whether the
    // request actually arrived in s2.
    // -----------------------------------------------------------------------
    const failedSpanIds = failedSpans.map((s) => s.spanId).filter(Boolean);

    const childTxResponse = await apmEventClient.search(
      'get_connection_failed_calls_child_transactions',
      {
        apm: { events: [ProcessorEvent.transaction] },
        track_total_hits: false,
        size: MAX_IDS,
        _source: false,
        fields: [PARENT_ID, TRANSACTION_ID, EVENT_OUTCOME],
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: targetServiceName } },
              { terms: { [PARENT_ID]: failedSpanIds } },
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
            ],
          },
        },
      }
    );

    // Map: exitSpanId → child transaction outcome
    const childBySpanId = new Map<string, { txId: string; failed: boolean }>();
    for (const hit of childTxResponse.hits.hits) {
      const f = (hit as any).fields ?? {};
      const parentId = String(f[PARENT_ID]?.[0] ?? '');
      const txId = String(f[TRANSACTION_ID]?.[0] ?? '');
      const outcome = f[EVENT_OUTCOME]?.[0];
      if (parentId && txId) {
        childBySpanId.set(parentId, { txId, failed: outcome === EventOutcome.failure });
      }
    }

    // Classify each failed span into a bucket
    const callerSpans: FailedSpan[] = [];
    const serverSpans: FailedSpan[] = [];
    const serverTxIds: string[] = [];
    const clientSpans: FailedSpan[] = [];

    for (const span of failedSpans) {
      const child = childBySpanId.get(span.spanId);
      if (!child) {
        // No child transaction → request never reached s2
        callerSpans.push(span);
      } else if (child.failed) {
        // s2 entry transaction failed → server error
        serverSpans.push(span);
        serverTxIds.push(child.txId);
      } else {
        // s2 succeeded but exit span failed → client error (4xx etc.)
        clientSpans.push(span);
      }
    }

    // -----------------------------------------------------------------------
    // Step 3: fetch top error message per bucket.
    // -----------------------------------------------------------------------
    const [callerErrorDoc, serverErrorDoc] = await Promise.all([
      callerSpans.length > 0
        ? getTopErrorForSpans({
            apmEventClient,
            serviceName: sourceServiceName,
            spanIds: callerSpans.map((s) => s.spanId),
            environment,
            start,
            end,
          })
        : Promise.resolve(null),
      serverTxIds.length > 0
        ? getTopErrorForTransactions({
            apmEventClient,
            serviceName: targetServiceName,
            transactionIds: serverTxIds,
            environment,
            start,
            end,
          })
        : Promise.resolve(null),
    ]);

    const callerHttpStatuses = mostFrequent(
      callerSpans.map((s) => s.httpStatus).filter((v): v is number => v !== null)
    );
    const callerGrpcCodes = mostFrequent(
      callerSpans.map((s) => s.grpcCode).filter((v): v is number => v !== null)
    );
    const clientHttpStatuses = mostFrequent(
      clientSpans.map((s) => s.httpStatus).filter((v): v is number => v !== null)
    );
    const clientGrpcCodes = mostFrequent(
      clientSpans.map((s) => s.grpcCode).filter((v): v is number => v !== null)
    );

    return {
      buckets: [
        {
          type: 'caller',
          count: callerSpans.length,
          sampleTraceId: callerSpans[0]?.traceId ?? null,
          ...pickTopError({
            errorDoc: callerErrorDoc,
            httpStatuses: callerHttpStatuses,
            grpcCodes: callerGrpcCodes,
          }),
        },
        {
          type: 'server',
          count: serverSpans.length,
          sampleTraceId: serverSpans[0]?.traceId ?? null,
          topError: serverErrorDoc?.message ?? null,
          topErrorGroupId: serverErrorDoc?.groupId ?? null,
        },
        {
          type: 'client',
          count: clientSpans.length,
          sampleTraceId: clientSpans[0]?.traceId ?? null,
          ...pickTopError({
            errorDoc: null,
            httpStatuses: clientHttpStatuses,
            grpcCodes: clientGrpcCodes,
          }),
        },
      ],
      totalFailed,
      totalCalls,
      isSampled,
    };
  });
}

/**
 * Fetches the top error message associated with the given s1 exit span IDs.
 * APM error docs link to spans via `span.id` / `parent.id`.
 *
 * Note: unprocessed OTel exceptions from `logs-*.otel-*` are not queried here
 * because the log client cannot aggregate. Those spans will fall back to the
 * HTTP/gRPC status label from the exit span itself.
 */
async function getTopErrorForSpans({
  apmEventClient,
  serviceName,
  spanIds,
  environment,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  serviceName: string;
  spanIds: string[];
  environment: Environment;
  start: number;
  end: number;
}): Promise<TopErrorDoc | null> {
  const response = await apmEventClient.search('get_connection_failed_calls_top_error_spans', {
    apm: { events: [ProcessorEvent.error] },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [SERVICE_NAME]: serviceName } },
          { terms: { [SPAN_ID]: spanIds } },
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
        ],
      },
    },
    aggs: {
      top_group: {
        terms: { field: ERROR_GROUP_ID, size: 1 },
        aggs: {
          sample: {
            top_hits: { size: 1, _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, ERROR_EXC_TYPE] },
          },
        },
      },
    },
  });

  return extractTopError(response);
}

/**
 * Fetches the top error doc associated with the given s2 transaction IDs.
 */
async function getTopErrorForTransactions({
  apmEventClient,
  serviceName,
  transactionIds,
  environment,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionIds: string[];
  environment: Environment;
  start: number;
  end: number;
}): Promise<TopErrorDoc | null> {
  const response = await apmEventClient.search('get_connection_failed_calls_top_error_txns', {
    apm: { events: [ProcessorEvent.error] },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [SERVICE_NAME]: serviceName } },
          { terms: { [TRANSACTION_ID]: transactionIds } },
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
        ],
      },
    },
    aggs: {
      top_group: {
        terms: { field: ERROR_GROUP_ID, size: 1 },
        aggs: {
          sample: {
            top_hits: { size: 1, _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, ERROR_EXC_TYPE] },
          },
        },
      },
    },
  });

  return extractTopError(response);
}

function extractTopError(
  response: Awaited<ReturnType<APMEventClient['search']>>
): TopErrorDoc | null {
  const topBucket = (response.aggregations as any)?.top_group?.buckets?.[0];
  if (!topBucket) return null;
  const source = topBucket.sample?.hits?.hits?.[0]?._source;
  if (!source) return null;
  const message: string | null =
    source[ERROR_LOG_MESSAGE] || source[ERROR_EXC_MESSAGE] || source[ERROR_EXC_TYPE] || null;
  if (!message) return null;
  return { message, groupId: String(topBucket.key) };
}
