/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { existsQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  SPAN_ID,
  SPAN_LINKS,
  TRACE_ID,
  TRANSACTION_ID,
  OTEL_SPAN_LINKS_SPAN_ID,
  OTEL_SPAN_LINKS_TRACE_ID,
  PROCESSOR_EVENT,
} from '../../../common/es_fields/apm';
import type { SpanRaw } from '../../../typings/es_schemas/raw/span_raw';
import type { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { mapOtelToSpanLink } from './utils';

export async function getLinkedParentsOfSpan({
  apmEventClient,
  traceId,
  spanId,
  start,
  end,
  processorEvent,
}: {
  traceId: string;
  spanId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  processorEvent?: ProcessorEvent;
}) {
  const optionalFields = asMutableArray([
    OTEL_SPAN_LINKS_SPAN_ID,
    OTEL_SPAN_LINKS_TRACE_ID,
  ] as const);

  const response = await apmEventClient.search(
    'get_linked_parents_of_span',
    {
      apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction] },
      _source: [SPAN_LINKS],
      fields: [...optionalFields],
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            { term: { [TRACE_ID]: traceId } },
            {
              bool: {
                should: [...existsQuery(SPAN_LINKS), ...existsQuery(OTEL_SPAN_LINKS_SPAN_ID)],
                minimum_should_match: 1,
              },
            },
            ...(processorEvent ? [{ term: { [PROCESSOR_EVENT]: processorEvent } }] : []),
            ...(processorEvent === ProcessorEvent.transaction
              ? [{ term: { [TRANSACTION_ID]: spanId } }]
              : [{ term: { [SPAN_ID]: spanId } }]),
          ],
        },
      },
    },
    { skipProcessorEventFilter: true }
  );

  const source = response.hits.hits?.[0]?._source as Pick<TransactionRaw | SpanRaw, 'span'>;
  const fields = response.hits.hits?.[0]?.fields;
  const event = fields && accessKnownApmEventFields(fields);

  return (
    source?.span?.links ??
    mapOtelToSpanLink(
      event && {
        trace_id: event[OTEL_SPAN_LINKS_TRACE_ID],
        span_id: event[OTEL_SPAN_LINKS_SPAN_ID],
      }
    )
  );
}
