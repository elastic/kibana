/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import {
  PROCESSOR_EVENT,
  SPAN_ID,
  SPAN_LINKS,
  SPAN_LINKS_TRACE_ID,
  SPAN_LINKS_SPAN_ID,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import type { SpanRaw } from '../../../typings/es_schemas/raw/span_raw';
import type { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { getBufferedTimerange } from './utils';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

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

  const response = await apmEventClient.search(
    'fetch_linked_children_of_span',
    {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      _source: [SPAN_LINKS, TRACE_ID, SPAN_ID, PROCESSOR_EVENT, TRANSACTION_ID],
      body: {
        track_total_hits: false,
        size: 1000,
        query: {
          bool: {
            filter: [
              ...rangeQuery(startWithBuffer, endWithBuffer),
              { term: { [SPAN_LINKS_TRACE_ID]: traceId } },
              ...(spanId ? [{ term: { [SPAN_LINKS_SPAN_ID]: spanId } }] : []),
            ],
          },
        },
      },
    }
  );
  // Filter out documents that don't have any span.links that match the combination of traceId and spanId
  return response.hits.hits.filter(({ _source: source }) => {
    const spanLinks = source.span?.links?.filter((spanLink) => {
      return (
        spanLink.trace.id === traceId &&
        (spanId ? spanLink.span.id === spanId : true)
      );
    });
    return !isEmpty(spanLinks);
  });
}

function getSpanId(source: TransactionRaw | SpanRaw) {
  return source.processor.event === ProcessorEvent.span
    ? (source as SpanRaw).span.id
    : (source as TransactionRaw).transaction?.id;
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
  return linkedChildren.reduce<Record<string, number>>(
    (acc, { _source: source }) => {
      source.span?.links?.forEach((link) => {
        // Ignores span links that don't belong to this trace
        if (link.trace.id === traceId) {
          acc[link.span.id] = (acc[link.span.id] || 0) + 1;
        }
      });
      return acc;
    },
    {}
  );
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

  return linkedChildren.map(({ _source: source }) => {
    return {
      trace: { id: source.trace.id },
      span: { id: getSpanId(source) },
    };
  });
}
