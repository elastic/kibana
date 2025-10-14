/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { existsQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  SPAN_ID,
  TRACE_ID,
  OTEL_EVENT_NAME,
  TIMESTAMP_US,
  PROCESSOR_EVENT,
  ID,
} from '../../../common/es_fields/apm';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { getApmTraceError } from './get_trace_items';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import type { TimestampUs } from '../../../typings/es_schemas/raw/fields/timestamp_us';

export interface UnifiedTraceErrors {
  apmErrors: Awaited<ReturnType<typeof getApmTraceError>>;
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
    getApmTraceError({ apmEventClient, ...commonParams }),
    getUnprocessedOtelErrors({ logsClient, ...commonParams }),
  ]);

  return {
    apmErrors,
    unprocessedOtelErrors,
    totalErrors: apmErrors.length + unprocessedOtelErrors.length,
  };
}

export const requiredFields = asMutableArray([SPAN_ID, ID] as const);
export const optionalFields = asMutableArray([
  EXCEPTION_TYPE,
  EXCEPTION_MESSAGE,
  TIMESTAMP_US,
] as const);

interface OtelError {
  span: {
    id: string;
  };
  exception?: {
    type: string;
    message: string;
  };
  timestamp?: TimestampUs;
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
    fields: [...requiredFields, ...optionalFields],
  });

  return response.hits.hits
    .map((hit) => {
      const event = unflattenKnownApmEventFields(hit.fields, requiredFields) as
        | OtelError
        | undefined;
      if (!event) return null;

      return {
        id: hit._id,
        spanId: event.span?.id,
        timestamp: event?.timestamp,
        error: {
          exception: {
            type: event.exception?.type,
            message: event.exception?.message,
          },
        },
      };
    })
    .filter(
      (
        doc
      ): doc is {
        id: string;
        spanId: string;
        timestamp: TimestampUs | undefined;
        error: { exception: { type: string | undefined; message: string | undefined } };
      } => !!doc
    );
}
