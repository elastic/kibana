/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { QueryDslQueryContainer, Sort } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { omit } from 'lodash';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  CHILD_ID,
  EVENT_OUTCOME,
  FAAS_COLDSTART,
  OTEL_SPAN_LINKS_SPAN_ID,
  OTEL_SPAN_LINKS_TRACE_ID,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_ACTION,
  SPAN_COMPOSITE_COMPRESSION_STRATEGY,
  SPAN_COMPOSITE_COUNT,
  SPAN_COMPOSITE_SUM,
  SPAN_DESTINATION_SERVICE_RESOURCE,
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
import type { WaterfallSpan, WaterfallTransaction } from '../../../common/waterfall/typings';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { mapOtelToSpanLink } from '../span_links/utils';
import { MAX_ITEMS_PER_PAGE } from './get_trace_items';

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

const requiredSpanFields = asMutableArray([SPAN_ID, SPAN_TYPE, SPAN_NAME, SPAN_DURATION] as const);

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
  SPAN_DESTINATION_SERVICE_RESOURCE,
  CHILD_ID,
  OTEL_SPAN_LINKS_SPAN_ID,
  OTEL_SPAN_LINKS_TRACE_ID,
] as const);

export async function getTraceDocsPerPage({
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
    ...body,
  });

  return {
    hits: res.hits.hits.map((hit) => {
      const sort = hit.sort;
      const fields = unflattenKnownApmEventFields(hit?.fields);

      const spanLinks =
        'span' in hit._source ? hit._source.span?.links : mapOtelToSpanLink(fields.links);

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
            links: spanLinks,
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
          links: spanLinks,
        },
      };

      return { hit: txWaterfallEvent, sort };
    }),
    total: res.hits.total.value,
  };
}
