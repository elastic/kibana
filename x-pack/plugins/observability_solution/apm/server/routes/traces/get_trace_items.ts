/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { QueryDslQueryContainer, Sort } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { last } from 'lodash';
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
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import { normalizeFields } from '../../utils/normalize_fields';

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
          filter: [{ term: { [TRACE_ID]: traceId } }, ...rangeQuery(start, end)],
          must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } },
        },
      },
      fields: [
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

  const traceDocs = traceResponse.hits.map(
    (hit) => normalizeFields(hit.fields) as unknown as WaterfallTransaction | WaterfallSpan
  );
  const errorDocs = errorResponse.hits.hits.map(
    (hit) => normalizeFields(hit.fields) as unknown as WaterfallError
  );

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
}) {
  const size = Math.min(maxTraceItems, MAX_ITEMS_PER_PAGE);

  const body = {
    track_total_hits: true,
    size,
    search_after: searchAfter,
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
    fields: [
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
    hits: res.hits.hits,
    total: res.hits.total.value,
  };
}
