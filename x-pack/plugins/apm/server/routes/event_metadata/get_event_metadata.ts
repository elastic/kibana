/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  ERROR_ID,
  SPAN_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getEventMetadata({
  apmEventClient,
  processorEvent,
  id,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  processorEvent: ProcessorEvent;
  id: string;
  start: number;
  end: number;
}) {
  const fieldName = getFieldName(processorEvent);
  const response = await apmEventClient.search('get_event_metadata', {
    apm: {
      events: [processorEvent],
    },
    body: {
      track_total_hits: false,
      query: {
        bool: {
          filter: [...rangeQuery(start, end), { term: { [fieldName]: id } }],
        },
      },
      size: 1,
      _source: false,
      fields: [{ field: '*', include_unmapped: true }],
    },
    terminate_after: 1,
  });

  return response.hits.hits[0].fields;
}

function getFieldName(processorEvent: ProcessorEvent) {
  switch (processorEvent) {
    case ProcessorEvent.error:
      return ERROR_ID;

    case ProcessorEvent.transaction:
      return TRANSACTION_ID;

    case ProcessorEvent.span:
      return SPAN_ID;

    default:
      throw new Error('Unknown processor event');
  }
}
