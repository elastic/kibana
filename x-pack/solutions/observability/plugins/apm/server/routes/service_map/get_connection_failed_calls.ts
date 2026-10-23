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
import { CONNECTION_JOIN_TIME_BUFFER_MS, MAX_CONNECTION_IDS } from './connection_constants';
import {
  fieldsOf,
  getTopErrorOfSpans,
  getTopErrorOfTransactions,
  pickTopError,
  type TopErrorDoc,
} from './get_connection_top_error';

interface FailedSpan {
  spanId: string;
  traceId: string | null;
  httpStatus: number | null;
  grpcCode: number | null;
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
    // so the environment of the target is not filtered; the range reaches past the window's end
    // because the entry transaction starts after the exit span that called it.
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
              ...rangeQuery(start, end + CONNECTION_JOIN_TIME_BUFFER_MS),
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
