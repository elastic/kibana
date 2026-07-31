/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedSpanDocument } from '@kbn/apm-types';
import { existsQuery, rangeQuery, termQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { castArray } from 'lodash';
import { SPAN_ID, TRACE_ID, PROCESSOR_EVENT, PARENT_ID } from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { LONG_FIELDS_SOURCE_FALLBACK } from '../event_metadata/get_event_metadata';
import { getFieldFromSource } from '../event_metadata/get_field_from_source';

export async function getUnifiedTraceSpan({
  spanId,
  traceId,
  apmEventClient,
  start,
  end,
  fields = ['*'],
}: {
  spanId?: string;
  traceId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  fields?: string[];
}): Promise<UnifiedSpanDocument | undefined> {
  const params = {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    track_total_hits: false,
    size: 1,
    terminate_after: 1,
    fields,
    _source: LONG_FIELDS_SOURCE_FALLBACK,
    query: {
      bool: {
        filter: [
          ...termQuery(SPAN_ID, spanId),
          ...termQuery(TRACE_ID, traceId),
          ...rangeQuery(start, end),
        ],
        ...(spanId ? {} : { must_not: existsQuery(PARENT_ID) }),
        should: [
          ...termsQuery(PROCESSOR_EVENT, ProcessorEvent.span, ProcessorEvent.transaction),
          { bool: { must_not: existsQuery(PROCESSOR_EVENT) } },
        ],
        minimum_should_match: 1,
      },
    },
  };
  const resp = await apmEventClient.search('get_unified_trace_span', params, {
    skipProcessorEventFilter: true,
  });

  const hit = resp.hits.hits[0];

  if (!hit) {
    return undefined;
  }

  const _id = hit?._id!;
  const _index = hit?._index!;

  const hitFields = { ...hit.fields };

  for (const fieldName of LONG_FIELDS_SOURCE_FALLBACK) {
    // Merge from _source when the indexed value is missing, or when ES flagged
    // the field as ignored — with array values, elements under the ignore_above
    // limit are indexed while longer ones are dropped, so `fields` can hold a
    // partial array while _source has the complete value.
    if (hitFields[fieldName] == null || hit._ignored?.includes(fieldName)) {
      const sourceValue = getFieldFromSource(hit._source, fieldName);
      if (sourceValue != null) {
        hitFields[fieldName] = castArray(sourceValue);
      }
    }
  }

  const event = accessKnownApmEventFields(hitFields).unflatten();

  if (!event) {
    return undefined;
  }

  return {
    ...event,
    _id,
    _index,
  } as UnifiedSpanDocument;
}
