/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Setup } from '../../lib/helpers/setup_request';
import {
  SPAN_LINKS,
  SPAN_LINKS_TRACE_ID,
  TRACE_ID,
  SPAN_ID,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import type { SpanLinks } from '../../../typings/es_schemas/raw/fields/span_links';
import type { SpanRaw } from '../../../typings/es_schemas/raw/span_raw';
import type { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';

// TODO: caue: add time range 4d
export async function getOutgoingSpanLinks({
  traceId,
  setup,
}: {
  traceId: string;
  setup: Setup;
}): Promise<Record<string, SpanLinks>> {
  const { apmEventClient } = setup;
  const response = await apmEventClient.search('get_outgoing_span_links', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    _source: [SPAN_LINKS, TRACE_ID, SPAN_ID, PROCESSOR_EVENT],
    body: {
      size: 1000,
      query: {
        bool: { filter: [{ term: { [SPAN_LINKS_TRACE_ID]: traceId } }] },
      },
    },
  });

  return response.hits.hits.reduce<Record<string, SpanLinks>>(
    (acc, { _source: item }) => {
      const id =
        item.processor.event === ProcessorEvent.transaction
          ? (item as TransactionRaw).transaction?.id
          : (item as SpanRaw).span.id;

      const spanLink = {
        trace: { id: item.trace.id },
        span: { id },
      };
      item.span?.links?.forEach((link) => {
        acc[link.span.id] = [
          ...(acc[link.span.id] || []),
          spanLink,
        ] as SpanLinks;
      });
      return acc;
    },
    {}
  );
}
