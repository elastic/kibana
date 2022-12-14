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
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { APMConfig } from '../..';
import {
  AGENT_NAME,
  CHILD_ID,
  ERROR_EXCEPTION,
  ERROR_GROUP_ID,
  ERROR_ID,
  ERROR_LOG_LEVEL,
  ERROR_LOG_MESSAGE,
  EVENT_OUTCOME,
  FAAS_COLDSTART,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_ACTION,
  SPAN_COMPOSITE_COMPRESSION_STRATEGY,
  SPAN_COMPOSITE_COUNT,
  SPAN_COMPOSITE_SUM,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_LINKS,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_SYNC,
  SPAN_TYPE,
  TIMESTAMP,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import {
  WaterfallError,
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../common/waterfall/typings';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getSpanLinksCountById } from '../span_links/get_linked_children';

export interface TraceItems {
  exceedsMax: boolean;
  traceDocs: Array<WaterfallTransaction | WaterfallSpan>;
  errorDocs: WaterfallError[];
  spanLinksCountById: Record<string, number>;
}

export async function getTraceItems(
  traceId: string,
  config: APMConfig,
  apmEventClient: APMEventClient,
  start: number,
  end: number
): Promise<TraceItems> {
  const maxTraceItems = config.ui.maxTraceItems;
  const excludedLogLevels = ['debug', 'info', 'warning'];

  const errorResponsePromise = apmEventClient.search('get_errors_docs', {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      track_total_hits: false,
      size: maxTraceItems,
      _source: [
        TIMESTAMP,
        TRACE_ID,
        TRANSACTION_ID,
        PARENT_ID,
        SERVICE_NAME,
        ERROR_ID,
        ERROR_LOG_MESSAGE,
        ERROR_EXCEPTION,
        ERROR_GROUP_ID,
      ],
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
      track_total_hits: maxTraceItems + 1,
      size: maxTraceItems,
      _source: [
        TIMESTAMP,
        TRACE_ID,
        PARENT_ID,
        SERVICE_NAME,
        SERVICE_ENVIRONMENT,
        AGENT_NAME,
        EVENT_OUTCOME,
        PROCESSOR_EVENT,
        TRANSACTION_DURATION,
        TRANSACTION_ID,
        TRANSACTION_NAME,
        TRANSACTION_TYPE,
        TRANSACTION_RESULT,
        FAAS_COLDSTART,
        SPAN_ID,
        SPAN_TYPE,
        SPAN_SUBTYPE,
        SPAN_ACTION,
        SPAN_NAME,
        SPAN_DURATION,
        SPAN_LINKS,
        SPAN_COMPOSITE_COUNT,
        SPAN_COMPOSITE_COMPRESSION_STRATEGY,
        SPAN_COMPOSITE_SUM,
        SPAN_SYNC,
        CHILD_ID,
      ],
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
    },
  });

  const [errorResponse, traceResponse, spanLinksCountById] = await Promise.all([
    errorResponsePromise,
    traceResponsePromise,
    getSpanLinksCountById({ traceId, apmEventClient, start, end }),
  ]);

  const exceedsMax = traceResponse.hits.total.value > maxTraceItems;
  const traceDocs = traceResponse.hits.hits.map((hit) => hit._source);
  const errorDocs = errorResponse.hits.hits.map((hit) => hit._source);

  return {
    exceedsMax,
    traceDocs,
    errorDocs,
    spanLinksCountById,
  };
}
