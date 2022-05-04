/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  PROCESSOR_EVENT,
  SPAN_ID,
  SPAN_LINKS,
  SPAN_LINKS_TRACE_ID,
  SPAN_LINKS_SPAN_ID,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import type { SpanRaw } from '../../../typings/es_schemas/raw/span_raw';
import type { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { Setup } from '../../lib/helpers/setup_request';
import { getBufferedTimerange } from './utils';

async function fetchLinkedParentsOfSpan({
  traceId,
  setup,
  start,
  end,
  spanId,
}: {
  traceId: string;
  setup: Setup;
  start: number;
  end: number;
  spanId?: string;
}) {
  const { apmEventClient } = setup;

  const { startWithBuffer, endWithBuffer } = getBufferedTimerange({
    start,
    end,
  });

  const response = await apmEventClient.search('fetch_linked_parents_of_span', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    _source: [SPAN_LINKS, TRACE_ID, SPAN_ID, PROCESSOR_EVENT, TRANSACTION_ID],
    body: {
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
  });

  return response.hits.hits;
}

function getSpanId(source: TransactionRaw | SpanRaw) {
  return source.processor.event === ProcessorEvent.span
    ? (source as SpanRaw).span.id
    : (source as TransactionRaw).transaction?.id;
}

export async function getLinkedParentsOfSpanCountBySpanId({
  traceId,
  setup,
  start,
  end,
}: {
  traceId: string;
  setup: Setup;
  start: number;
  end: number;
}) {
  const outgoingSpans = await fetchLinkedParentsOfSpan({
    traceId,
    setup,
    start,
    end,
  });

  return outgoingSpans.reduce<Record<string, number>>(
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

export async function getLinkedParentsOfSpan({
  traceId,
  spanId,
  setup,
  start,
  end,
}: {
  traceId: string;
  spanId: string;
  setup: Setup;
  start: number;
  end: number;
}) {
  const outgoingSpan = await fetchLinkedParentsOfSpan({
    traceId,
    spanId,
    setup,
    start,
    end,
  });

  return outgoingSpan.map(({ _source: source }) => {
    return {
      trace: { id: source.trace.id },
      span: { id: getSpanId(source) },
    };
  });
}
