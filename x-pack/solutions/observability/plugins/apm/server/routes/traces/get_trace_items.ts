/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { QueryDslQueryContainer, Sort } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { last, omit } from 'lodash';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { APMConfig } from '../..';
import {
  AGENT_NAME,
  CHILD_ID,
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
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
  TIMESTAMP_US,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import type {
  WaterfallError,
  WaterfallSpan,
  WaterfallTransaction,
} from '../../../common/waterfall/typings';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getSpanLinksCountById } from '../span_links/get_linked_children';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';

export interface TraceItems {
  exceedsMax: boolean;
  traceDocs: Array<WaterfallTransaction | WaterfallSpan>;
  errorDocs: WaterfallError[];
  spanLinksCountById: Record<string, number>;
  traceDocsTotal: number;
  maxTraceItems: number;
}

export async function getTraceItems({
  traceId,
  config,
  apmEventClient,
  start,
  end,
  maxTraceItemsFromUrlParam,
  logger,
}: {
  traceId: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  maxTraceItemsFromUrlParam?: number;
  logger: Logger;
}): Promise<TraceItems> {
  const maxTraceItems = maxTraceItemsFromUrlParam ?? config.ui.maxTraceItems;
  const excludedLogLevels = ['debug', 'info', 'warning'];

  const requiredFields = asMutableArray([
    TIMESTAMP_US,
    TRACE_ID,
    SERVICE_NAME,
    ERROR_ID,
    ERROR_GROUP_ID,
    PROCESSOR_EVENT,
  ] as const);

  const optionalFields = asMutableArray([
    PARENT_ID,
    TRANSACTION_ID,
    SPAN_ID,
    ERROR_CULPRIT,
    ERROR_LOG_MESSAGE,
    ERROR_EXC_MESSAGE,
    ERROR_EXC_HANDLED,
    ERROR_EXC_TYPE,
  ] as const);

  const errorResponsePromise = apmEventClient.search('get_errors_docs', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: [{ term: { [TRACE_ID]: traceId } }, ...rangeQuery(start, end)],
          must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } },
        },
      },
      fields: [...requiredFields, ...optionalFields],
      _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, ERROR_EXC_HANDLED, ERROR_EXC_TYPE],
    },
  });

  const traceResponsePromise = getTraceDocsPaginated({
    apmEventClient,
    maxTraceItems,
    traceId,
    start,
    end,
    logger,
  });

  const [errorResponse, traceResponse, spanLinksCountById] = await Promise.all([
    errorResponsePromise,
    traceResponsePromise,
    getSpanLinksCountById({ traceId, apmEventClient, start, end }),
  ]);

  const traceDocsTotal = traceResponse.total;
  const exceedsMax = traceDocsTotal > maxTraceItems;

  const traceDocs = traceResponse.hits.map(({ hit }) => hit);

  const errorDocs = errorResponse.hits.hits.map((hit) => {
    const errorSource = 'error' in hit._source ? hit._source : undefined;

    const event = unflattenKnownApmEventFields(hit.fields, requiredFields);

    const waterfallErrorEvent: WaterfallError = {
      ...event,
      parent: {
        ...event?.parent,
        id: event?.parent?.id ?? event?.span?.id,
      },
      error: {
        ...(event.error ?? {}),
        exception:
          (errorSource?.error.exception?.length ?? 0) > 0
            ? errorSource?.error.exception
            : event?.error.exception && [event.error.exception],
        log: errorSource?.error.log,
      },
    };

    return waterfallErrorEvent;
  });

  return {
    exceedsMax,
    traceDocs,
    errorDocs,
    spanLinksCountById,
    traceDocsTotal,
    maxTraceItems,
  };
}

const MAX_ITEMS_PER_PAGE = 10000; // 10000 is the max allowed by ES

async function getTraceDocsPaginated({
  apmEventClient,
  maxTraceItems,
  traceId,
  start,
  end,
  hits = [],
  searchAfter,
  logger,
}: {
  apmEventClient: APMEventClient;
  maxTraceItems: number;
  traceId: string;
  start: number;
  end: number;
  logger: Logger;
  hits?: Awaited<ReturnType<typeof getTraceDocsPerPage>>['hits'];
  searchAfter?: SortResults;
}): ReturnType<typeof getTraceDocsPerPage> {
  const response = await getTraceDocsPerPage({
    apmEventClient,
    maxTraceItems,
    traceId,
    start,
    end,
    searchAfter,
  });

  const mergedHits = [...hits, ...response.hits];

  logger.debug(
    `Paginating traces: retrieved: ${response.hits.length}, (total: ${mergedHits.length} of ${response.total}), maxTraceItems: ${maxTraceItems}`
  );

  if (
    mergedHits.length >= maxTraceItems ||
    mergedHits.length >= response.total ||
    mergedHits.length === 0 ||
    response.hits.length < MAX_ITEMS_PER_PAGE
  ) {
    return {
      hits: mergedHits,
      total: response.total,
    };
  }

  return getTraceDocsPaginated({
    apmEventClient,
    maxTraceItems,
    traceId,
    start,
    end,
    hits: mergedHits,
    searchAfter: last(response.hits)?.sort,
    logger,
  });
}

async function getTraceDocsPerPage({
  apmEventClient,
  maxTraceItems,
  traceId,
  start,
  end,
  searchAfter,
}: {
  apmEventClient: APMEventClient;
  maxTraceItems: number;
  traceId: string;
  start: number;
  end: number;
  searchAfter?: SortResults;
}): Promise<{
  hits: Array<{ hit: WaterfallTransaction | WaterfallSpan; sort: SortResults | undefined }>;
  total: number;
}> {
  const size = Math.min(maxTraceItems, MAX_ITEMS_PER_PAGE);

  const requiredFields = asMutableArray([
    AGENT_NAME,
    TIMESTAMP_US,
    TRACE_ID,
    SERVICE_NAME,
    PROCESSOR_EVENT,
  ] as const);

  const requiredTxFields = asMutableArray([
    TRANSACTION_ID,
    TRANSACTION_DURATION,
    TRANSACTION_NAME,
    TRANSACTION_TYPE,
  ] as const);

  const requiredSpanFields = asMutableArray([
    SPAN_ID,
    SPAN_TYPE,
    SPAN_NAME,
    SPAN_DURATION,
  ] as const);

  const optionalFields = asMutableArray([
    PARENT_ID,
    SERVICE_ENVIRONMENT,
    EVENT_OUTCOME,
    TRANSACTION_RESULT,
    FAAS_COLDSTART,
    SPAN_SUBTYPE,
    SPAN_ACTION,
    SPAN_COMPOSITE_COUNT,
    SPAN_COMPOSITE_COMPRESSION_STRATEGY,
    SPAN_COMPOSITE_SUM,
    SPAN_SYNC,
    CHILD_ID,
  ] as const);

  const body = {
    track_total_hits: true,
    size,
    search_after: searchAfter,
    _source: [SPAN_LINKS],
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
    fields: [...requiredFields, ...requiredTxFields, ...requiredSpanFields, ...optionalFields],
    sort: [
      { _score: 'asc' },
      {
        _script: {
          type: 'number',
          script: {
            lang: 'painless',
            source: `$('${TRANSACTION_DURATION}', $('${SPAN_DURATION}', 0))`,
          },
          order: 'desc',
        },
      },
      { '@timestamp': 'asc' },
      { _doc: 'asc' },
    ] as Sort,
  };

  const res = await apmEventClient.search('get_trace_docs', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    body,
  });

  return {
    hits: res.hits.hits.map((hit) => {
      const sort = hit.sort;
      const spanLinksSource = 'span' in hit._source ? hit._source.span?.links : undefined;

      if (hit.fields[PROCESSOR_EVENT]?.[0] === ProcessorEvent.span) {
        const spanEvent = unflattenKnownApmEventFields(hit.fields, [
          ...requiredFields,
          ...requiredSpanFields,
        ]);

        const spanWaterfallEvent: WaterfallSpan = {
          ...omit(spanEvent, 'child'),
          processor: {
            event: 'span',
          },
          span: {
            ...spanEvent.span,
            composite: spanEvent.span.composite
              ? (spanEvent.span.composite as Required<WaterfallSpan['span']>['composite'])
              : undefined,
            links: spanLinksSource,
          },
          ...(spanEvent.child ? { child: spanEvent.child as WaterfallSpan['child'] } : {}),
        };

        return { sort, hit: spanWaterfallEvent };
      }

      const txEvent = unflattenKnownApmEventFields(hit.fields, [
        ...requiredFields,
        ...requiredTxFields,
      ]);
      const txWaterfallEvent: WaterfallTransaction = {
        ...txEvent,
        processor: {
          event: 'transaction',
        },
        span: {
          ...txEvent.span,
          links: spanLinksSource,
        },
      };

      return { hit: txWaterfallEvent, sort };
    }),
    total: res.hits.total.value,
  };
}
