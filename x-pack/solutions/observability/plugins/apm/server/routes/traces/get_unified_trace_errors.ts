/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { existsQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { getApmTraceError } from './get_trace_items';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  ERROR_MESSAGE,
  STATUS_CODE,
} from '../../../common/es_fields/apm';

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
}) {
  const [apmErrors, unprocessedOtelError] = await Promise.all([
    getApmTraceError({ apmEventClient, traceId, start, end }),
    getUnprocessedOtelErrors({ apmEventClient, traceId, start, end }),
  ]);

  return {
    apmErrors: apmErrors.hits.hits.map((hit) => hit._source),
    unprocessedOtelErrors: unprocessedOtelError.hits.hits.map((hit) => hit._source),
    totalErrors: apmErrors.hits.hits.length + unprocessedOtelError.hits.hits.length,
  };
}

function getUnprocessedOtelErrors({
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
  return apmEventClient.search(
    'get_unprocessed_errors_docs',
    {
      apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction, ProcessorEvent.error] },
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: [],
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
    },
    { skipProcessorEventFilter: true }
  );
}
