/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Sort } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
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
import { getFieldValue } from '../../utils/get_field_value';

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

  function addError(id: string, errorDocId: string) {
    if (!groupedErrorsByDocId[id]) {
      groupedErrorsByDocId[id] = [];
    }
    groupedErrorsByDocId[id].push({ errorDocId });
  }

  unifiedTraceErrors.apmErrors.forEach((errorDoc) => {
    const id = errorDoc.transaction?.id || errorDoc.span?.id;
    if (id) {
      addError(id, errorDoc.id);
    }
  });
  unifiedTraceErrors.unprocessedOtelErrors.forEach((errorDoc) =>
    errorDoc.spanId ? addError(errorDoc.spanId, errorDoc.id) : undefined
  );

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

  const traceErrorsSearch = getUnifiedTraceErrors({
    apmEventClient,
    logsClient,
    traceId,
    start,
    end,
  });

  const serviceNameQuery = serviceName ? termQuery(SERVICE_NAME, serviceName) : [];

  const traceItemSearch = apmEventClient.search(
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
                  ...serviceNameQuery,
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

  const [unifiedTraceErrors, unifiedTraces] = await Promise.all([
    traceErrorsSearch,
    traceItemSearch,
  ]);

  const errorsByDocId = getErrorsByDocId(unifiedTraceErrors);

  return {
    traceItems: unifiedTraces.hits.hits
      .map((hit) => {
        const event = hit.fields;
        const apmDuration =
          getFieldValue<number>(SPAN_DURATION, event) ||
          getFieldValue<number>(TRANSACTION_DURATION, event);
        const id =
          getFieldValue<string>(SPAN_ID, event) || getFieldValue<string>(TRANSACTION_ID, event);

        if (!id) {
          return undefined;
        }

        const docErrors = errorsByDocId[id] || [];

        return {
          id,
          timestampUs:
            getFieldValue(TIMESTAMP_US, event) ??
            toMicroseconds(getFieldValue(AT_TIMESTAMP, event)),
          name: getFieldValue(SPAN_NAME, event) ?? getFieldValue(TRANSACTION_NAME, event),
          traceId: getFieldValue(TRACE_ID, event),
          duration: resolveDuration(apmDuration, getFieldValue(DURATION, event)),
          ...(getFieldValue(EVENT_OUTCOME, event) || getFieldValue(STATUS_CODE, event)
            ? {
                status: {
                  fieldName: getFieldValue(EVENT_OUTCOME, event) ? EVENT_OUTCOME : STATUS_CODE,
                  value: getFieldValue(EVENT_OUTCOME, event) || getFieldValue(STATUS_CODE, event),
                },
              }
            : {}),
          errors: docErrors,
          parentId: getFieldValue(PARENT_ID, event),
          serviceName: getFieldValue(SERVICE_NAME, event),
          type:
            getFieldValue(SPAN_SUBTYPE, event) ||
            getFieldValue(SPAN_TYPE, event) ||
            getFieldValue(KIND, event),
        } satisfies TraceItem;
      })
      .filter((item) => !!item) as TraceItem[],
    unifiedTraceErrors,
  };
}

/**
 * Resolve either an APM or OTEL duration and if OTEL, format the duration from nanoseconds to microseconds.
 */
const resolveDuration = (apmDuration?: number, otelDuration?: number[] | string): number =>
  apmDuration ?? parseOtelDuration(otelDuration);

const toMicroseconds = (ts: string) => new Date(ts).getTime() * 1000; // Convert ms to us
