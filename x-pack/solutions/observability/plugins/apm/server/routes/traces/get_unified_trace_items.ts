/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Sort } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import type { APMConfig } from '../..';
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
  TIMESTAMP_US,
} from '../../../common/es_fields/apm';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { TraceItem } from '../../../common/waterfall/unified_trace_item';
import { MAX_ITEMS_PER_PAGE } from './get_trace_items';
import { getUnifiedTraceErrors, type UnifiedTraceErrors } from './get_unified_trace_errors';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';

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
  TIMESTAMP_US,
] as const);

export function getErrorCountByDocId(unifiedTraceErrors: UnifiedTraceErrors) {
  const groupedErrorCountByDocId: Record<string, number> = {};

  function incrementErrorCount(id: string) {
    if (!groupedErrorCountByDocId[id]) {
      groupedErrorCountByDocId[id] = 0;
    }
    groupedErrorCountByDocId[id] += 1;
  }

  unifiedTraceErrors.apmErrors.forEach((doc) =>
    doc.parent?.id ? incrementErrorCount(doc.parent.id) : undefined
  );
  unifiedTraceErrors.unprocessedOtelErrors.forEach((doc) =>
    doc.id ? incrementErrorCount(doc.id) : undefined
  );

  return groupedErrorCountByDocId;
}

/**
 * Returns both APM documents and unprocessed OTEL spans
 */
export async function getUnifiedTraceItems({
  apmEventClient,
  logsClient,
  maxTraceItemsFromUrlParam,
  traceId,
  start,
  end,
  config,
}: {
  apmEventClient: APMEventClient;
  logsClient: LogsClient;
  maxTraceItemsFromUrlParam?: number;
  traceId: string;
  start: number;
  end: number;
  config: APMConfig;
}): Promise<{ traceItems: TraceItem[]; unifiedTraceErrors: UnifiedTraceErrors }> {
  const maxTraceItems = maxTraceItemsFromUrlParam ?? config.ui.maxTraceItems;
  const size = Math.min(maxTraceItems, MAX_ITEMS_PER_PAGE);

  const unifiedTraceErrorsPromise = getUnifiedTraceErrors({
    apmEventClient,
    logsClient,
    traceId,
    start,
    end,
  });

  const unifiedTracePromise = apmEventClient.search(
    'get_unified_trace_items',
    {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      body: {
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
    },
    { skipProcessorEventFilter: true }
  );

  const [unifiedTraceErrors, unifiedTraceItems] = await Promise.all([
    unifiedTraceErrorsPromise,
    unifiedTracePromise,
  ]);

  const errorCountByDocId = getErrorCountByDocId(unifiedTraceErrors);

  return {
    traceItems: unifiedTraceItems.hits.hits
      .map((hit) => {
        const event = accessKnownApmEventFields(hit.fields).requireFields(fields);
        const apmDuration = event[SPAN_DURATION] ?? event[TRANSACTION_DURATION];
        const id = event[SPAN_ID] ?? event[TRANSACTION_ID];
        const name = event[SPAN_NAME] ?? event[TRANSACTION_NAME];

        if (!id || !name) {
          return undefined;
        }

        const docErrorCount = errorCountByDocId[id] || 0;
        const statusCode = event[STATUS_CODE];
        return {
          id,
          name,
          timestampUs: event[TIMESTAMP_US] ?? toMicroseconds(event[AT_TIMESTAMP]),
          traceId: event[TRACE_ID],
          duration: resolveDuration(apmDuration, event[DURATION]),
          hasError: docErrorCount > 0 || statusCode === 'Error',
          parentId: event[PARENT_ID],
          serviceName: event['service.name'],
        } satisfies TraceItem;
      })
      .filter((_) => _) as TraceItem[],
    unifiedTraceErrors,
  };
}

/**
 * Resolve either an APM or OTEL duration and if OTEL, format the duration from nanoseconds to microseconds.
 */
function resolveDuration(apmDuration?: number, otelDuration?: number[] | string): number {
  if (apmDuration) {
    return apmDuration;
  }

  const duration = Array.isArray(otelDuration)
    ? otelDuration[0]
    : otelDuration
    ? parseFloat(otelDuration)
    : 0;

  return duration * 0.001;
}

const toMicroseconds = (ts: string) => new Date(ts).getTime() * 1000; // Convert ms to us
