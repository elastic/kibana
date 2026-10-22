/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type { ConnectionFailedCallsResponse } from '@kbn/apm-api-shared';
import { ATTRIBUTE_RPC_GRPC_STATUS_CODE, RPC_GRPC_STATUS_CODE } from '@kbn/apm-types';
import {
  AT_TIMESTAMP,
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
import { MAX_CONNECTION_IDS } from './connection_constants';

/**
 * Names of the gRPC status codes shown in "Top error" labels.
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

type Fields = Record<string, unknown[] | undefined>;

const fieldsOf = (hit: { fields?: unknown }): Fields => (hit.fields as Fields | undefined) ?? {};

interface FailedSpan {
  spanId: string;
  traceId: string | null;
  httpStatus: number | null;
  grpcCode: number | null;
}

interface TopErrorDoc {
  message: string;
  groupId: string;
}

const grpcLabel = (code: number) => `gRPC ${GRPC_CODE_NAMES[code] ?? code}`;

/** The values of `getValue` over `spans`, most frequent first. */
function rankByFrequency(spans: FailedSpan[], getValue: (span: FailedSpan) => number | null) {
  const frequency = new Map<number, number>();
  for (const span of spans) {
    const value = getValue(span);
    if (value !== null) {
      frequency.set(value, (frequency.get(value) ?? 0) + 1);
    }
  }
  return [...frequency.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}

/**
 * The top error label of a bucket and, when it comes from an APM error document, its error
 * group id (used to open the error group). Priority: APM error document → HTTP status → gRPC
 * status of the span.
 */
function pickTopError({ errorDoc, spans }: { errorDoc: TopErrorDoc | null; spans: FailedSpan[] }): {
  topError: string | null;
  topErrorGroupId: string | null;
} {
  if (errorDoc) {
    return { topError: errorDoc.message, topErrorGroupId: errorDoc.groupId };
  }
  const [httpStatus] = rankByFrequency(spans, (span) => span.httpStatus);
  if (httpStatus !== undefined) {
    return { topError: `HTTP ${httpStatus}`, topErrorGroupId: null };
  }
  const [grpcCode] = rankByFrequency(spans, (span) => span.grpcCode);
  if (grpcCode !== undefined) {
    return { topError: grpcLabel(grpcCode), topErrorGroupId: null };
  }
  return { topError: null, topErrorGroupId: null };
}

const getBucket = ({
  type,
  spans,
  errorDoc,
}: {
  type: 'caller' | 'server' | 'client' | 'dependency';
  spans: FailedSpan[];
  errorDoc: TopErrorDoc | null;
}) => ({
  type,
  count: spans.length,
  sampleTraceId: spans[0]?.traceId ?? null,
  ...pickTopError({ errorDoc, spans }),
});

/**
 * Failed calls of a connection, split by where they failed.
 *
 * The calls are the exit spans of the source service to the connection's resources
 * (`dependencies`). For service → service edges (`targetServiceName`) each failed exit span is
 * classified by what happened in the target service:
 * - `caller`: no entry transaction in the target (the request never arrived),
 * - `server`: the target's entry transaction failed,
 * - `client`: the target's entry transaction succeeded but the exit span failed (4xx etc.).
 * For service → dependency edges there is a single `dependency` bucket.
 *
 * The newest {@link MAX_CONNECTION_IDS} failed spans are classified, `totalFailed` and
 * `totalCalls` are exact and `isSampled` tells when the buckets do not cover every failed call.
 * Unprocessed OTel exceptions (log documents) are not queried: spans fall back to their
 * HTTP / gRPC status.
 */
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
    const exitSpansFilter: QueryDslQueryContainer[] = [
      { term: { [SERVICE_NAME]: sourceServiceName } },
      { terms: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencies } },
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
    ];

    const [failedSpansResponse, totalCallsResponse] = await Promise.all([
      apmEventClient.search('get_connection_failed_calls_failed_spans', {
        apm: { events: [ProcessorEvent.span] },
        track_total_hits: true,
        size: MAX_CONNECTION_IDS,
        sort: [{ [AT_TIMESTAMP]: 'desc' }],
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
            filter: [...exitSpansFilter, { term: { [EVENT_OUTCOME]: EventOutcome.failure } }],
          },
        },
      }),
      apmEventClient.search('get_connection_failed_calls_total_calls', {
        apm: { events: [ProcessorEvent.span] },
        track_total_hits: true,
        size: 0,
        query: { bool: { filter: exitSpansFilter } },
      }),
    ]);

    const totalFailed = failedSpansResponse.hits.total.value;
    const totalCalls = totalCallsResponse.hits.total.value;

    const failedSpans: FailedSpan[] = failedSpansResponse.hits.hits.map((hit) => {
      const fields = fieldsOf(hit);
      return {
        spanId: String(fields[SPAN_ID]?.[0] ?? ''),
        traceId: (fields[TRACE_ID]?.[0] as string | undefined) ?? null,
        httpStatus: (fields[HTTP_RESPONSE_STATUS_CODE]?.[0] as number | undefined) ?? null,
        grpcCode:
          ((fields[ATTRIBUTE_RPC_GRPC_STATUS_CODE]?.[0] ?? fields[RPC_GRPC_STATUS_CODE]?.[0]) as
            | number
            | undefined) ?? null,
      };
    });

    if (failedSpans.length === 0) {
      return { buckets: [], totalFailed: 0, totalCalls, isSampled: false };
    }

    const isSampled = totalFailed > failedSpans.length;

    // Service → dependency: one bucket, there is no target service to look into.
    if (!targetServiceName) {
      const errorDoc = await getTopErrorOfSpans({
        apmEventClient,
        serviceName: sourceServiceName,
        spanIds: failedSpans.map(({ spanId }) => spanId),
        environment,
        start,
        end,
      });
      return {
        buckets: [getBucket({ type: 'dependency', spans: failedSpans, errorDoc })],
        totalFailed,
        totalCalls,
        isSampled,
      };
    }

    // Service → service: the target's entry transactions whose parent is one of the failed exit
    // spans tell whether (and how) the request arrived. The parent id is specific to the call,
    // so the environment of the target is not filtered.
    const failedSpanIds = failedSpans.map(({ spanId }) => spanId);
    const entryTransactionsResponse = await apmEventClient.search(
      'get_connection_failed_calls_target_transactions',
      {
        apm: { events: [ProcessorEvent.transaction] },
        track_total_hits: false,
        size: MAX_CONNECTION_IDS,
        _source: false,
        fields: [PARENT_ID, TRANSACTION_ID, EVENT_OUTCOME],
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: targetServiceName } },
              { terms: { [PARENT_ID]: failedSpanIds } },
              ...rangeQuery(start, end),
            ],
          },
        },
      }
    );

    const entryTransactionByParentId = new Map<string, { id: string; failed: boolean }>();
    for (const hit of entryTransactionsResponse.hits.hits) {
      const fields = fieldsOf(hit);
      const parentId = String(fields[PARENT_ID]?.[0] ?? '');
      const id = String(fields[TRANSACTION_ID]?.[0] ?? '');
      if (parentId && id) {
        entryTransactionByParentId.set(parentId, {
          id,
          failed: fields[EVENT_OUTCOME]?.[0] === EventOutcome.failure,
        });
      }
    }

    const callerSpans: FailedSpan[] = [];
    const serverSpans: FailedSpan[] = [];
    const serverTransactionIds: string[] = [];
    const clientSpans: FailedSpan[] = [];

    for (const span of failedSpans) {
      const entryTransaction = entryTransactionByParentId.get(span.spanId);
      if (!entryTransaction) {
        callerSpans.push(span);
      } else if (entryTransaction.failed) {
        serverSpans.push(span);
        serverTransactionIds.push(entryTransaction.id);
      } else {
        clientSpans.push(span);
      }
    }

    const [callerErrorDoc, serverErrorDoc] = await Promise.all([
      callerSpans.length > 0
        ? getTopErrorOfSpans({
            apmEventClient,
            serviceName: sourceServiceName,
            spanIds: callerSpans.map(({ spanId }) => spanId),
            environment,
            start,
            end,
          })
        : null,
      serverTransactionIds.length > 0
        ? getTopErrorOfTransactions({
            apmEventClient,
            serviceName: targetServiceName,
            transactionIds: serverTransactionIds,
            start,
            end,
          })
        : null,
    ]);

    return {
      buckets: [
        getBucket({ type: 'caller', spans: callerSpans, errorDoc: callerErrorDoc }),
        getBucket({ type: 'server', spans: serverSpans, errorDoc: serverErrorDoc }),
        getBucket({ type: 'client', spans: clientSpans, errorDoc: null }),
      ],
      totalFailed,
      totalCalls,
      isSampled,
    };
  });
}

/**
 * The most frequent error group of the error documents matching `filter`, with the message of
 * one of its documents.
 */
async function getTopError({
  apmEventClient,
  operationName,
  filter,
}: {
  apmEventClient: APMEventClient;
  operationName: string;
  filter: QueryDslQueryContainer[];
}): Promise<TopErrorDoc | null> {
  const response = await apmEventClient.search(operationName, {
    apm: { events: [ProcessorEvent.error] },
    track_total_hits: false,
    size: 0,
    query: { bool: { filter } },
    aggs: {
      top_group: {
        terms: { field: ERROR_GROUP_ID, size: 1 },
        aggs: {
          sample: {
            top_hits: {
              size: 1,
              // `fields` returns flat keys, a `_source` filter returns nested objects.
              _source: false,
              fields: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, ERROR_EXC_TYPE],
            },
          },
        },
      },
    },
  });

  const topGroup = response.aggregations?.top_group.buckets[0];
  const sample = topGroup?.sample.hits.hits[0];
  if (!topGroup || !sample) {
    return null;
  }

  const fields = fieldsOf(sample);
  const message = [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, ERROR_EXC_TYPE]
    .map((field) => fields[field]?.[0])
    .find((value): value is string => typeof value === 'string' && value !== '');

  return message ? { message, groupId: String(topGroup.key) } : null;
}

/**
 * Top error of the failed exit spans of the source service. APM error documents point to the
 * span they happened in with `parent.id` (and, for some agents, `span.id`).
 *
 * Unprocessed OTel exceptions (`logs-*.otel-*`) are not queried here: the logs client cannot
 * aggregate.
 */
function getTopErrorOfSpans({
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
}) {
  return getTopError({
    apmEventClient,
    operationName: 'get_connection_failed_calls_top_error_of_spans',
    filter: [
      { term: { [SERVICE_NAME]: serviceName } },
      {
        bool: {
          should: [{ terms: { [PARENT_ID]: spanIds } }, { terms: { [SPAN_ID]: spanIds } }],
          minimum_should_match: 1,
        },
      },
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
    ],
  });
}

/** Top error of the failed entry transactions of the target service. */
function getTopErrorOfTransactions({
  apmEventClient,
  serviceName,
  transactionIds,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionIds: string[];
  start: number;
  end: number;
}) {
  return getTopError({
    apmEventClient,
    operationName: 'get_connection_failed_calls_top_error_of_transactions',
    filter: [
      { term: { [SERVICE_NAME]: serviceName } },
      { terms: { [TRANSACTION_ID]: transactionIds } },
      ...rangeQuery(start, end),
    ],
  });
}
