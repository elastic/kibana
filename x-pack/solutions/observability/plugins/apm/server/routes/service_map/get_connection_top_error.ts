/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  PARENT_ID,
  SERVICE_NAME,
  SPAN_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { CONNECTION_JOIN_TIME_BUFFER_MS } from './connection_constants';

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
  6: 'ALREADY_EXISTS',
  7: 'PERMISSION_DENIED',
  8: 'RESOURCE_EXHAUSTED',
  9: 'FAILED_PRECONDITION',
  10: 'ABORTED',
  11: 'OUT_OF_RANGE',
  12: 'UNIMPLEMENTED',
  13: 'INTERNAL',
  14: 'UNAVAILABLE',
  15: 'DATA_LOSS',
  16: 'UNAUTHENTICATED',
};

export type Fields = Record<string, unknown[] | undefined>;

export const fieldsOf = (hit: { fields?: unknown }): Fields =>
  (hit.fields as Fields | undefined) ?? {};

export interface TopErrorDoc {
  message: string;
  groupId: string;
}

interface SpanStatus {
  httpStatus: number | null;
  grpcCode: number | null;
}

/** The values of `getValue` over `spans`, most frequent first. */
function rankByFrequency(spans: SpanStatus[], getValue: (span: SpanStatus) => number | null) {
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
 * The top error label of a bucket and, when it comes from an APM error document, its error group
 * id. Priority: APM error document → HTTP status → gRPC status of the spans.
 */
export function pickTopError({
  errorDoc,
  spans,
}: {
  errorDoc: TopErrorDoc | null;
  spans: SpanStatus[];
}): { topError: string | null; topErrorGroupId: string | null } {
  if (errorDoc) {
    return { topError: errorDoc.message, topErrorGroupId: errorDoc.groupId };
  }
  const [httpStatus] = rankByFrequency(spans, (span) => span.httpStatus);
  if (httpStatus !== undefined) {
    return { topError: `HTTP ${httpStatus}`, topErrorGroupId: null };
  }
  const [grpcCode] = rankByFrequency(spans, (span) => span.grpcCode);
  if (grpcCode !== undefined) {
    return { topError: `gRPC ${GRPC_CODE_NAMES[grpcCode] ?? grpcCode}`, topErrorGroupId: null };
  }
  return { topError: null, topErrorGroupId: null };
}

/** The most frequent error group matching `filter`, with the message of one of its documents. */
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
 * Top error of the failed exit spans of the source service. APM error documents point to the span
 * they happened in with `parent.id` (and, for some agents, `span.id`). Unprocessed OTel exceptions
 * (log documents) are not queried: the logs client cannot aggregate.
 */
export function getTopErrorOfSpans({
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
      ...rangeQuery(start, end + CONNECTION_JOIN_TIME_BUFFER_MS),
      ...environmentQuery(environment),
    ],
  });
}

/** Top error of the failed entry transactions of the target service. */
export function getTopErrorOfTransactions({
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
      ...rangeQuery(start, end + CONNECTION_JOIN_TIME_BUFFER_MS),
    ],
  });
}
