/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsQuery, rangeQuery, termQuery, termsQuery } from '@kbn/observability-plugin/server';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { TraceRootSpan } from '@kbn/apm-types';
import { maybe } from '../../../common/utils/maybe';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  TRACE_ID,
  PARENT_ID,
  TRANSACTION_DURATION,
  SPAN_DURATION,
  DURATION,
  SPAN_ID,
  PROCESSOR_EVENT,
} from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { parseOtelDuration } from '../../lib/helpers/parse_otel_duration';

export async function getUnifiedTraceRootSpanByTraceId({
  traceId,
  apmEventClient,
  start,
  end,
}: {
  traceId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<TraceRootSpan | undefined> {
  const optionalFields = asMutableArray([
    TRANSACTION_DURATION,
    SPAN_DURATION,
    DURATION,
    SPAN_ID,
  ] as const);

  const params = {
    apm: {
      events: [ProcessorEvent.transaction, ProcessorEvent.span],
    },
    track_total_hits: false,
    size: 1,
    terminate_after: 1,
    query: {
      bool: {
        filter: [...termQuery(TRACE_ID, traceId), ...rangeQuery(start, end)],
        must_not: existsQuery(PARENT_ID),
        should: [
          ...termsQuery(PROCESSOR_EVENT, ProcessorEvent.span, ProcessorEvent.transaction),
          { bool: { must_not: existsQuery(PROCESSOR_EVENT) } },
        ],
        minimum_should_match: 1,
      },
    },
    fields: optionalFields,
  };

  const resp = await apmEventClient.search('get_unified_trace_root_span_by_trace_id', params, {
    skipProcessorEventFilter: true,
  });

  const event = unflattenKnownApmEventFields(maybe(resp.hits.hits[0])?.fields, []);

  if (!event) {
    return undefined;
  }

  const apmDuration = event.transaction?.duration?.us ?? event.span?.duration?.us;
  const otelDuration = event.duration;

  return {
    duration: apmDuration ?? parseOtelDuration(otelDuration),
  } as TraceRootSpan;
}
