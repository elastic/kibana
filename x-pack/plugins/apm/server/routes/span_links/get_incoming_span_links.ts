/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SPAN_ID,
  SPAN_LINKS,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';

export async function getIncomingSpanLinks({
  setup,
  traceId,
  spanId,
}: {
  traceId: string;
  spanId: string;
  setup: Setup;
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
            { term: { [TRACE_ID]: traceId } },
            { exists: { field: SPAN_LINKS } },
            {
              bool: {
                should: [
                  { term: { [SPAN_ID]: spanId } },
                  { term: { [TRANSACTION_ID]: spanId } },
                ],
              },
            },
          ],
        },
      },
    },
  });

  return response.hits.hits?.[0]?._source?.span?.links || [];
}
