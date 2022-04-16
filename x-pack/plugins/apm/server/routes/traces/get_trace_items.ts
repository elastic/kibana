/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryDslQueryContainer,
  Sort,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  TRACE_ID,
  TRANSACTION_DURATION,
  SPAN_DURATION,
  PARENT_ID,
  ERROR_LOG_LEVEL,
} from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../../lib/helpers/setup_request';

export async function getTraceItems(
  traceId: string,
  setup: Setup,
  start: number,
  end: number
) {
  const { apmEventClient, config } = setup;
  const maxTraceItems = config.ui.maxTraceItems;
  const excludedLogLevels = ['debug', 'info', 'warning'];

  const errorResponsePromise = apmEventClient.search('get_errors_docs', {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      size: maxTraceItems,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            ...rangeQuery(start, end),
          ],
          must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } },
        },
      },
    },
  });

  const traceResponsePromise = apmEventClient.search('get_trace_docs', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    body: {
      size: maxTraceItems,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            ...rangeQuery(start, end),
          ] as QueryDslQueryContainer[],
          should: {
            exists: { field: PARENT_ID },
          },
        },
      },
      sort: [
        { _score: { order: 'asc' as const } },
        { [TRANSACTION_DURATION]: { order: 'desc' as const } },
        { [SPAN_DURATION]: { order: 'desc' as const } },
      ] as Sort,
      track_total_hits: true,
    },
  });

  const errorResponse = await errorResponsePromise;
  const traceResponse = await traceResponsePromise;

  const exceedsMax = traceResponse.hits.total.value > maxTraceItems;
  const traceDocs = traceResponse.hits.hits.map((hit) => hit._source);
  const errorDocs = errorResponse.hits.hits.map((hit) => hit._source);

  return { exceedsMax, traceDocs, errorDocs };
}
