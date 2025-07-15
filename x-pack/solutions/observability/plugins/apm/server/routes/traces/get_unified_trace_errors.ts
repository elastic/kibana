/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { existsQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  ERROR_MESSAGE,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  PROCESSOR_EVENT,
  SPAN_ID,
  STATUS_CODE,
  TRACE_ID,
} from '../../../common/es_fields/apm';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { getApmTraceError } from './get_trace_items';

export interface UnifiedTraceErrors {
  apmErrors: Awaited<ReturnType<typeof getApmTraceError>>;
  unprocessedOtelErrors: Awaited<ReturnType<typeof getUnprocessedOtelErrors>>;
  totalErrors: number;
}

export async function getUnifiedTraceErrors({
  apmEventClient,
  end,
  start,
  traceId,
}: {
  apmEventClient: APMEventClient;
  traceId: string;
  start: number;
  end: number;
}): Promise<UnifiedTraceErrors> {
  const [apmErrors, unprocessedOtelError] = await Promise.all([
    getApmTraceError({ apmEventClient, traceId, start, end }),
    getUnprocessedOtelErrors({ apmEventClient, traceId, start, end }),
  ]);

  return {
    apmErrors,
    unprocessedOtelErrors: unprocessedOtelError,
    totalErrors: apmErrors.length + unprocessedOtelError.length,
  };
}

export const optionalFields = asMutableArray([
  SPAN_ID,
  ERROR_MESSAGE,
  EXCEPTION_TYPE,
  EXCEPTION_MESSAGE,
] as const);

async function getUnprocessedOtelErrors({
  apmEventClient,
  end,
  start,
  traceId,
}: {
  apmEventClient: APMEventClient;
  traceId: string;
  start: number;
  end: number;
}) {
  const response = await apmEventClient.search(
    'get_unprocessed_errors_docs',
    {
      apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction, ProcessorEvent.error] },
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          must: [
            {
              bool: {
                filter: [...rangeQuery(start, end), ...termQuery(TRACE_ID, traceId)],
                must_not: existsQuery(PROCESSOR_EVENT),
                should: [
                  ...termQuery(STATUS_CODE, 'Error'),
                  ...existsQuery(ERROR_MESSAGE),
                  ...existsQuery(EXCEPTION_TYPE),
                  ...existsQuery(EXCEPTION_MESSAGE),
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      fields: optionalFields,
    },
    { skipProcessorEventFilter: true }
  );

  return response.hits.hits.map((hit) => {
    const event = unflattenKnownApmEventFields(hit.fields);

    return {
      id: event.span?.id,
      error: {
        message: event.error?.message,
        exception: {
          type: event.exception?.type,
          message: event.exception?.message,
        },
      },
    };
  });
}
