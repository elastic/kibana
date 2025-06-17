/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import type { Sort } from '@elastic/elasticsearch/lib/api/types';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { MAX_ITEMS_PER_PAGE } from './get_trace_items';
import {
  AT_TIMESTAMP,
  DURATION,
  PARENT_ID,
  PROCESSOR_EVENT,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  STATUS_CODE,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
} from '../../../common/es_fields/apm';
import type { APMConfig } from '../..';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { TraceItem } from '../../../common/waterfall/unified_trace_item';

const fields = asMutableArray(['@timestamp', 'trace.id', 'service.name'] as const);

const optionalFields = asMutableArray([
  SPAN_ID,
  SPAN_NAME,
  DURATION,
  SPAN_DURATION,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  PROCESSOR_EVENT,
  PARENT_ID,
  STATUS_CODE,
] as const);

/**
 * Returns both APM documents and unprocessed OTEL spans
 */
export async function getUnifiedTraceItems({
  apmEventClient,
  maxTraceItemsFromUrlParam,
  traceId,
  start,
  end,
  config,
}: {
  apmEventClient: APMEventClient;
  maxTraceItemsFromUrlParam?: number;
  traceId: string;
  start: number;
  end: number;
  config: APMConfig;
}): Promise<TraceItem[]> {
  const maxTraceItems = maxTraceItemsFromUrlParam ?? config.ui.maxTraceItems;
  const size = Math.min(maxTraceItems, MAX_ITEMS_PER_PAGE);

  const response = await apmEventClient.search(
    'get_unified_trace_items',
    {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      track_total_hits: true,
      size,
      query: {
        bool: {
          must: [
            {
              bool: {
                filter: [...termQuery(TRACE_ID, traceId), ...rangeQuery(start, end)],
                should: { exists: { field: PARENT_ID } },
              },
            },
          ],
          should: [
            { terms: { [PROCESSOR_EVENT]: [ProcessorEvent.span, ProcessorEvent.transaction] } },
            { bool: { must_not: { exists: { field: PROCESSOR_EVENT } } } },
          ],
          minimum_should_match: 1,
        },
      },
      fields: [...fields, ...optionalFields],
      sort: [
        { _score: 'asc' },
        {
          _script: {
            type: 'number',
            script: {
              lang: 'painless',
              source: `$('${TRANSACTION_DURATION}', $('${SPAN_DURATION}', $('${DURATION}', 0)))`,
            },
            order: 'desc',
          },
        },
        { [AT_TIMESTAMP]: 'asc' },
        { _doc: 'asc' },
      ] as Sort,
    },
    { skipProcessorEventFilter: true }
  );

  return response.hits.hits.map((hit) => {
    const event = unflattenKnownApmEventFields(hit.fields, fields);
    const apmDuration = event.span?.duration?.us || event.transaction?.duration?.us;

    return {
      id: event.span?.id ?? event.transaction?.id,
      timestamp: event[AT_TIMESTAMP],
      name: event.span?.name ?? event.transaction?.name,
      traceId: event.trace.id,
      duration:
        apmDuration !== undefined
          ? apmDuration
          : Array.isArray(event.duration)
          ? (event.duration as number[])[0]
          : event.duration ?? 0,
      hasError:
        event.status?.code && Array.isArray(event.status.code)
          ? event.status.code[0] === 'Error'
          : false,
      parentId: event.parent?.id,
      serviceName: event.service.name,
    } as TraceItem;
  });
}
