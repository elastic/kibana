/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { existsQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import {
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  ID,
  SPAN_ID,
  TRACE_ID,
  TRANSACTION_ID,
  OTEL_EVENT_NAME,
  TIMESTAMP_US,
  PROCESSOR_EVENT,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_EXC_HANDLED,
  ERROR_GROUP_ID,
  ERROR_CULPRIT,
  ERROR_ID,
} from '../../../common/es_fields/apm';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import type { TimestampUs } from '../../../typings/es_schemas/raw/fields/timestamp_us';
import type { Exception } from '../../../typings/es_schemas/raw/error_raw';
import {
  getApmTraceErrorQuery,
  requiredFields as requiredApmFields,
} from './get_apm_trace_error_query';
import { compactMap } from '../../utils/compact_map';

export interface UnifiedTraceErrors {
  apmErrors: Awaited<ReturnType<typeof getUnifiedApmTraceError>>;
  unprocessedOtelErrors: Awaited<ReturnType<typeof getUnprocessedOtelErrors>>;
  totalErrors: number;
}

export async function getUnifiedTraceErrors({
  apmEventClient,
  logsClient,
  traceId,
  docId,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  logsClient: LogsClient;
  traceId: string;
  docId?: string;
  start: number;
  end: number;
}): Promise<UnifiedTraceErrors> {
  const commonParams = { traceId, docId, start, end };

  const [apmErrors, unprocessedOtelErrors] = await Promise.all([
    getUnifiedApmTraceError({ apmEventClient, ...commonParams }),
    getUnprocessedOtelErrors({ logsClient, ...commonParams }),
  ]);

  return {
    apmErrors,
    unprocessedOtelErrors,
    totalErrors: apmErrors.length + unprocessedOtelErrors.length,
  };
}

export const requiredOtelFields = asMutableArray([SPAN_ID, ID] as const);
export const optionalOtelFields = asMutableArray([
  EXCEPTION_TYPE,
  EXCEPTION_MESSAGE,
  TIMESTAMP_US,
  OTEL_EVENT_NAME,
] as const);

export interface UnifiedError {
  id: string;
  spanId: string;
  timestamp?: TimestampUs;
  eventName?: string;
  error: {
    id?: string;
    exception?: Exception;
    grouping_key?: string;
    culprit?: string;
    log?: {
      message: string;
    };
  };
}

async function getUnifiedApmTraceError(params: {
  apmEventClient: APMEventClient;
  traceId: string;
  docId?: string;
  start: number;
  end: number;
}) {
  const response = await getApmTraceErrorQuery(params);

  return compactMap(response.hits.hits, (hit) => {
    const errorSource = 'error' in hit._source ? hit._source : undefined;
    const event = hit.fields
      ? accessKnownApmEventFields(hit.fields).requireFields(requiredApmFields)
      : undefined;

    const spanId = event?.[TRANSACTION_ID] ?? event?.[SPAN_ID];

    if (!event || !spanId) {
      return null;
    }

    const error: UnifiedError = {
      id: event[ID],
      spanId,
      timestamp: { us: event[TIMESTAMP_US] },
      error: {
        id: event[ERROR_ID],
        grouping_key: event[ERROR_GROUP_ID],
        log: errorSource?.error.log,
        culprit: event[ERROR_CULPRIT],
        exception: errorSource?.error.exception?.[0] ?? {
          type: event[ERROR_EXC_TYPE],
          message: event[ERROR_EXC_MESSAGE],
          handled: event[ERROR_EXC_HANDLED],
        },
      },
    };

    return error;
  });
}

async function getUnprocessedOtelErrors({
  logsClient,
  traceId,
  docId,
  start,
  end,
}: {
  logsClient: LogsClient;
  traceId: string;
  docId?: string;
  start: number;
  end: number;
}) {
  const response = await logsClient.search({
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...termQuery(TRACE_ID, traceId),
          ...termQuery(SPAN_ID, docId),
        ],
        should: [
          ...termQuery(OTEL_EVENT_NAME, 'exception'),
          ...existsQuery(EXCEPTION_TYPE),
          ...existsQuery(EXCEPTION_MESSAGE),
        ],
        minimum_should_match: 1,
        must_not: { exists: { field: PROCESSOR_EVENT } },
      },
    },
    fields: [...requiredOtelFields, ...optionalOtelFields],
  });

  return compactMap(response.hits.hits, (hit) => {
    const event = hit.fields
      ? accessKnownApmEventFields(hit.fields as Partial<FlattenedApmEvent>).requireFields(
          requiredOtelFields
        )
      : undefined;

    if (!event) return null;

    const timestamp = event[TIMESTAMP_US];

    const error: UnifiedError = {
      id: event[ID],
      spanId: event[SPAN_ID],
      timestamp: timestamp != null ? { us: timestamp } : undefined,
      eventName: event[OTEL_EVENT_NAME],
      error: {
        exception: {
          type: event[EXCEPTION_TYPE],
          message: event[EXCEPTION_MESSAGE],
        },
      },
    };

    return error;
  });
}
