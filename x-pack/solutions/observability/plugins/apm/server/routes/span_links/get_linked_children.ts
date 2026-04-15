/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  SPAN_ID,
  SPAN_LINKS,
  SPAN_LINKS_TRACE_ID,
  SPAN_LINKS_SPAN_ID,
  TRACE_ID,
  TRANSACTION_ID,
  OTEL_SPAN_LINKS_TRACE_ID,
  OTEL_SPAN_LINKS_SPAN_ID,
} from '../../../common/es_fields/apm';
import { getBufferedTimerange, mapOtelToSpanLink } from './utils';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

async function fetchLinkedChildrenOfSpan({
  traceId,
  apmEventClient,
  start,
  end,
  spanId,
}: {
  traceId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  spanId?: string;
}) {
  const { startWithBuffer, endWithBuffer } = getBufferedTimerange({
    start,
    end,
  });

  const requiredFields = asMutableArray([TRACE_ID] as const);
  const optionalFields = asMutableArray([
    SPAN_ID,
    TRANSACTION_ID,
    OTEL_SPAN_LINKS_SPAN_ID,
    OTEL_SPAN_LINKS_TRACE_ID,
  ] as const);

  const response = await apmEventClient.search(
    'fetch_linked_children_of_span',
    {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      _source: [SPAN_LINKS],
      fields: [...requiredFields, ...optionalFields],
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: [
            ...rangeQuery(startWithBuffer, endWithBuffer),
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  ...termQuery(SPAN_LINKS_TRACE_ID, traceId),
                  ...termQuery(OTEL_SPAN_LINKS_TRACE_ID, traceId),
                ],
              },
            },
            ...(spanId
              ? [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        ...termQuery(SPAN_LINKS_SPAN_ID, spanId),
                        ...termQuery(OTEL_SPAN_LINKS_SPAN_ID, spanId),
                      ],
                    },
                  },
                ]
              : []),
          ],
        },
      },
    },
    { skipProcessorEventFilter: true }
  );

  const linkedChildren = response.hits.hits.map((hit) => {
    const source = 'span' in hit._source ? hit._source : undefined;
    const event = accessKnownApmEventFields(hit.fields).requireFields(requiredFields).build();

    const spanLinksArray = source?.span?.links
      ? Array.isArray(source?.span?.links)
        ? source.span.links
        : [source.span.links]
      : undefined;
    return {
      ...event,
      [SPAN_LINKS]:
        spanLinksArray ??
        mapOtelToSpanLink({
          trace_id: event[OTEL_SPAN_LINKS_TRACE_ID],
          span_id: event[OTEL_SPAN_LINKS_SPAN_ID],
        }),
    };
  });
  // Filter out documents that don't have any span.links that match the combination of traceId and spanId
  return linkedChildren.filter((linkedChild) =>
    linkedChild[SPAN_LINKS].some(
      (spanLink) => spanLink.trace.id === traceId && (spanId ? spanLink.span.id === spanId : true)
    )
  );
}

function getSpanId(
  linkedChild: Awaited<ReturnType<typeof fetchLinkedChildrenOfSpan>>[number]
): string {
  return (linkedChild[SPAN_ID] ?? linkedChild[TRANSACTION_ID]) as string;
}

export async function getSpanLinksCountById({
  traceId,
  apmEventClient,
  start,
  end,
}: {
  traceId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) {
  const linkedChildren = await fetchLinkedChildrenOfSpan({
    traceId,
    apmEventClient,
    start,
    end,
  });

  return linkedChildren.reduce<Record<string, number>>((acc, item) => {
    item[SPAN_LINKS].forEach((link) => {
      // Ignores span links that don't belong to this trace
      if (link.trace.id === traceId) {
        acc[link.span.id] = (acc[link.span.id] || 0) + 1;
      }
    });
    return acc;
  }, {});
}

export async function getLinkedChildrenOfSpan({
  traceId,
  spanId,
  apmEventClient,
  start,
  end,
}: {
  traceId: string;
  spanId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) {
  const linkedChildren = await fetchLinkedChildrenOfSpan({
    traceId,
    spanId,
    apmEventClient,
    start,
    end,
  });

  return linkedChildren.map((item) => ({
    trace: { id: item[TRACE_ID] },
    span: { id: getSpanId(item) },
  }));
}
