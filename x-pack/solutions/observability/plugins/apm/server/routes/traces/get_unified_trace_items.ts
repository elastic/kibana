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
import type { StatusCode, EventOutcome } from '@kbn/apm-types';
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
  EVENT_OUTCOME,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  KIND,
  SERVICE_NAME,
} from '../../../common/es_fields/apm';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { TraceItem } from '../../../common/waterfall/unified_trace_item';
import { MAX_ITEMS_PER_PAGE } from './get_trace_items';
import { getUnifiedTraceErrors, type UnifiedTraceErrors } from './get_unified_trace_errors';
import { parseOtelDuration } from '../../lib/helpers/parse_otel_duration';
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
  EVENT_OUTCOME,
  STATUS_CODE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  KIND,
] as const);

export function getErrorsByDocId(unifiedTraceErrors: UnifiedTraceErrors) {
  const groupedErrorsByDocId: Record<string, Array<{ errorDocId: string }>> = {};

  unifiedTraceErrors.apmErrors.forEach((errorDoc) => {
    if (errorDoc.spanId) {
      (groupedErrorsByDocId[errorDoc.spanId] ??= []).push({ errorDocId: errorDoc.id });
    }
  });
  unifiedTraceErrors.unprocessedOtelErrors.forEach((errorDoc) => {
    if (errorDoc.spanId) {
      (groupedErrorsByDocId[errorDoc.spanId] ??= []).push({ errorDocId: errorDoc.id });
    }
  });

  return groupedErrorsByDocId;
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
  serviceName,
}: {
  apmEventClient: APMEventClient;
  logsClient: LogsClient;
  maxTraceItemsFromUrlParam?: number;
  traceId: string;
  start: number;
  end: number;
  config: APMConfig;
  serviceName?: string;
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
      track_total_hits: true,
      size,
      query: {
        bool: {
          must: [
            {
              bool: {
                filter: [
                  ...termQuery(TRACE_ID, traceId),
                  ...rangeQuery(start, end),
                  ...termQuery(SERVICE_NAME, serviceName),
                ],
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

  const [unifiedTraceErrors, unifiedTraceItems] = await Promise.all([
    unifiedTraceErrorsPromise,
    unifiedTracePromise,
  ]);

  const errorsByDocId = getErrorsByDocId(unifiedTraceErrors);

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

        return {
          id,
          name,
          timestampUs: event[TIMESTAMP_US] ?? toMicroseconds(event[AT_TIMESTAMP]),
          traceId: event[TRACE_ID],
          duration: resolveDuration(apmDuration, event[DURATION]),
          status: resolveStatus(event[EVENT_OUTCOME], event[STATUS_CODE]),
          errors: errorsByDocId[id] ?? [],
          parentId: event[PARENT_ID],
          serviceName: event[SERVICE_NAME],
          type: event[SPAN_SUBTYPE] || event[SPAN_TYPE] || event[KIND],
        } satisfies TraceItem;
      })
      .filter((_) => _) as TraceItem[],
    unifiedTraceErrors,
  };
}

/**
 * Resolve either an APM or OTEL duration and if OTEL, format the duration from nanoseconds to microseconds.
 */
const resolveDuration = (apmDuration?: number, otelDuration?: number[] | string): number =>
  apmDuration ?? parseOtelDuration(otelDuration);

const toMicroseconds = (ts: string) => new Date(ts).getTime() * 1000; // Convert ms to us

type EventStatus =
  | { fieldName: 'event.outcome'; value: EventOutcome }
  | { fieldName: 'status.code'; value: StatusCode }
  | undefined;

const resolveStatus = (eventOutcome?: EventOutcome, statusCode?: StatusCode): EventStatus => {
  if (eventOutcome) {
    return { fieldName: EVENT_OUTCOME, value: eventOutcome };
  }

  if (statusCode) {
    return { fieldName: STATUS_CODE, value: statusCode };
  }
};
