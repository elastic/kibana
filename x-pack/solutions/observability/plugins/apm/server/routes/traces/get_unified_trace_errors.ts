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
  SPAN_ID,
  TRACE_ID,
  OTEL_EVENT_NAME,
  TIMESTAMP_US,
  PROCESSOR_EVENT,
  ID,
  ERROR_LOG_LEVEL,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import type { TimestampUs } from '../../../typings/es_schemas/raw/fields/timestamp_us';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';

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

export const requiredApmFields = asMutableArray([TIMESTAMP_US, PROCESSOR_EVENT, ID] as const);
export const optionalApmFields = asMutableArray([
  TRANSACTION_ID,
  SPAN_ID,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
] as const);

export const requiredOtelFields = asMutableArray([SPAN_ID, ID] as const);
export const optionalOtelFields = asMutableArray([
  EXCEPTION_TYPE,
  EXCEPTION_MESSAGE,
  TIMESTAMP_US,
  OTEL_EVENT_NAME,
] as const);

const excludedLogLevels = ['debug', 'info', 'warning'];

export interface UnifiedError {
  id: string;
  spanId: string;
  timestamp: TimestampUs | undefined;
  eventName: string | undefined;
  error: { exception: { type: string | undefined; message: string | undefined } };
}

async function getUnifiedApmTraceError({
  apmEventClient,
  traceId,
  docId,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceId: string;
  docId?: string;
  start: number;
  end: number;
}) {
  const response = await apmEventClient.search('get_errors_docs', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    track_total_hits: false,
    size: 1000,
    query: {
      bool: {
        filter: [
          ...termQuery(TRACE_ID, traceId),
          ...termQuery(SPAN_ID, docId),
          ...rangeQuery(start, end),
        ],
        must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } },
      },
    },
    fields: [...requiredApmFields, ...optionalApmFields],
    _source: [ERROR_EXC_MESSAGE, ERROR_EXC_TYPE],
  });

  return response.hits.hits
    .map((hit) => {
      const errorSource = 'error' in hit._source ? hit._source : undefined;
      const event = hit.fields
        ? accessKnownApmEventFields(hit.fields, requiredApmFields)
        : undefined;

      const spanId = event?.[TRANSACTION_ID] ?? event?.[SPAN_ID];

      if (!event || !spanId) {
        return undefined;
      }

      const exceptionSource = errorSource?.error.exception?.[0];

      const error: UnifiedError = {
        id: event[ID],
        spanId,
        eventName: undefined,
        timestamp: { us: event[TIMESTAMP_US] },
        error: {
          exception: exceptionSource
            ? { type: exceptionSource.type, message: exceptionSource.message }
            : { type: event[ERROR_EXC_TYPE], message: event[ERROR_EXC_MESSAGE] },
        },
      };

      return error;
    })
    .filter((doc): doc is UnifiedError => !!doc);
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

  return response.hits.hits
    .map((hit) => {
      const event = hit.fields
        ? accessKnownApmEventFields(hit.fields as Partial<FlattenedApmEvent>, requiredOtelFields)
        : undefined;

      if (!event) return null;

      const timestamp = event[TIMESTAMP_US];

      return {
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
      } satisfies UnifiedError;
    })
    .filter((doc): doc is UnifiedError => !!doc);
}
