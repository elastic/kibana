/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ERROR_ID,
  SPAN_ID,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getEventMetadata({
  apmEventClient,
  processorEvent,
  id,
}: {
  apmEventClient: APMEventClient;
  processorEvent: ProcessorEvent;
  id: string;
}) {
  const filter: QueryDslQueryContainer[] = [];

  switch (processorEvent) {
    case ProcessorEvent.error:
      filter.push({
        term: { [ERROR_ID]: id },
      });
      break;

    case ProcessorEvent.transaction:
      filter.push({
        term: {
          [TRANSACTION_ID]: id,
        },
      });
      break;

    case ProcessorEvent.span:
      filter.push({
        term: { [SPAN_ID]: id },
      });
      break;
  }

  const response = await apmEventClient.search('get_event_metadata', {
    apm: {
      events: [processorEvent],
    },
    body: {
      query: {
        bool: { filter },
      },
      size: 1,
      _source: false,
      fields: [{ field: '*', include_unmapped: true }],
    },
    terminate_after: 1,
  });

  return response.hits.hits[0].fields;
}
