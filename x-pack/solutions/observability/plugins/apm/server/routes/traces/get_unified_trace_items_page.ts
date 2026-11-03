/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Sort, SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  AT_TIMESTAMP,
  DURATION,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SPAN_DURATION,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_MARKS_AGENT,
} from '../../../common/es_fields/apm';
import { ensureFocusedTraceHits, getTraceHitId } from './ensure_focused_trace_hits';
import {
  ecsOnlyOptionalFields,
  fields,
  MAX_ITEMS_PER_PAGE,
  optionalFields,
} from './trace_constants';

async function getUnifiedTraceItemsPage({
  apmEventClient,
  size,
  traceId,
  start,
  end,
  serviceName,
  searchAfter,
  ecsOnly,
}: {
  apmEventClient: APMEventClient;
  size: number;
  traceId: string;
  start: number;
  end: number;
  serviceName?: string;
  searchAfter?: SortResults;
  ecsOnly: boolean;
}) {
  const query = ecsOnly
    ? {
        bool: {
          filter: [
            ...termQuery(TRACE_ID, traceId),
            ...rangeQuery(start, end),
            ...termQuery(SERVICE_NAME, serviceName),
          ],
          should: { exists: { field: PARENT_ID } },
        },
      }
    : {
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
      };

  const sortScript = ecsOnly
    ? `$('${TRANSACTION_DURATION}', $('${SPAN_DURATION}', 0))`
    : `$('${TRANSACTION_DURATION}', $('${SPAN_DURATION}', $('${DURATION}', 0)))`;

  const response = await apmEventClient.search(
    'get_unified_trace_items',
    {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      track_total_hits: true,
      size,
      query,
      fields: [...fields, ...(ecsOnly ? ecsOnlyOptionalFields : optionalFields)],
      _source: [TRANSACTION_MARKS_AGENT],
      sort: [
        { _score: 'asc' },
        {
          _script: {
            type: 'number',
            script: {
              lang: 'painless',
              source: sortScript,
            },
            order: 'desc',
          },
        },
        { [AT_TIMESTAMP]: 'asc' },
        { _doc: 'asc' },
      ] as Sort,
      ...(searchAfter ? { search_after: searchAfter } : {}),
    },
    { skipProcessorEventFilter: !ecsOnly }
  );

  return {
    hits: response.hits.hits,
    total: response.hits.total?.value ?? 0,
  };
}

type PageHits = Awaited<ReturnType<typeof getUnifiedTraceItemsPage>>['hits'];

async function paginate({
  apmEventClient,
  maxTraceItems,
  traceId,
  start,
  end,
  serviceName,
  hits,
  seenIds,
  searchAfter,
  ecsOnly,
}: {
  apmEventClient: APMEventClient;
  maxTraceItems: number;
  traceId: string;
  start: number;
  end: number;
  serviceName?: string;
  hits: PageHits;
  seenIds: Set<string>;
  searchAfter?: SortResults;
  ecsOnly: boolean;
}): Promise<{ hits: PageHits; total: number }> {
  const size = Math.min(maxTraceItems - hits.length, MAX_ITEMS_PER_PAGE);
  const response = await getUnifiedTraceItemsPage({
    apmEventClient,
    size,
    traceId,
    start,
    end,
    serviceName,
    searchAfter,
    ecsOnly,
  });

  // A document can be indexed in multiple indices (e.g. traces-apm and apm-*) and appear
  // more than once in the same response. Previously handled with collapse, which only works
  // within a single page. seenIds deduplicates across both within-page and cross-page results.
  const newHits = response.hits.filter((hit) => {
    const id = getTraceHitId(hit);
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });

  hits.push(...newHits);
  const hitLimit = hits.length >= maxTraceItems;
  if (hitLimit) hits.length = maxTraceItems;
  const truncatedHits = hits;

  const lastSort = response.hits[response.hits.length - 1]?.sort;
  if (
    hitLimit ||
    hits.length >= response.total ||
    response.hits.length === 0 ||
    response.hits.length < size ||
    !lastSort
  ) {
    return { hits: truncatedHits, total: response.total };
  }

  return paginate({
    apmEventClient,
    maxTraceItems,
    traceId,
    start,
    end,
    serviceName,
    hits: truncatedHits,
    seenIds,
    searchAfter: lastSort as SortResults,
    ecsOnly,
  });
}

export async function getUnifiedTraceItemsPaginated({
  apmEventClient,
  maxTraceItems,
  traceId,
  start,
  end,
  serviceName,
  ecsOnly = false,
  focusedDocId,
}: {
  apmEventClient: APMEventClient;
  maxTraceItems: number;
  traceId: string;
  start: number;
  end: number;
  serviceName?: string;
  ecsOnly?: boolean;
  focusedDocId?: string;
}): Promise<{ hits: PageHits; total: number }> {
  const result = await paginate({
    apmEventClient,
    maxTraceItems,
    traceId,
    start,
    end,
    serviceName,
    hits: [],
    seenIds: new Set(),
    ecsOnly,
  });

  if (!focusedDocId || result.total <= maxTraceItems) {
    return result;
  }

  const hits = await ensureFocusedTraceHits({
    apmEventClient,
    hits: result.hits,
    focusedDocId,
    maxTraceItems,
    traceId,
    start,
    end,
    ecsOnly,
    serviceName,
  });

  return { hits, total: result.total };
}
