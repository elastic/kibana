/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  SPAN_ID,
  SPAN_LINKS,
  TRACE_ID,
  TRANSACTION_ID,
  PROCESSOR_EVENT,
} from '../../../common/es_fields/apm';
import { SpanRaw } from '../../../typings/es_schemas/raw/span_raw';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { normalizeFields } from '../../utils/normalize_fields';

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
  processorEvent: ProcessorEvent;
}) {
  const response = await apmEventClient.search('get_linked_parents_of_span', {
    apm: {
      events: [processorEvent],
    },
    _source: [SPAN_LINKS],
    body: {
      track_total_hits: false,
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

  const fields = response.hits.hits[0]?.fields;
  const fieldsNorm = normalizeFields(fields) as unknown as TransactionRaw | SpanRaw | undefined;

  return fieldsNorm?.span?.links || [];
}
