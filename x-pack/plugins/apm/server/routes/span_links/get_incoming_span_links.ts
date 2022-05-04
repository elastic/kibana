/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  SPAN_ID,
  SPAN_LINKS,
  TRACE_ID,
  TRANSACTION_ID,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';

export async function getIncomingSpanLinks({
  setup,
  traceId,
  spanId,
  start,
  end,
  processorEvent,
}: {
  traceId: string;
  spanId: string;
  setup: Setup;
  start: number;
  end: number;
  processorEvent: ProcessorEvent;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search('get_span_links_details', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    _source: [SPAN_LINKS],
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            { term: { [TRACE_ID]: traceId } },
            { exists: { field: SPAN_LINKS } },
            { term: { [PROCESSOR_EVENT]: processorEvent } },
            ...(processorEvent === ProcessorEvent.transaction
              ? [{ term: { [TRANSACTION_ID]: spanId } }]
              : [{ term: { [SPAN_ID]: spanId } }]),
          ],
        },
      },
    },
  });

  return response.hits.hits?.[0]?._source?.span?.links || [];
}
