/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType } from '../../../../common/document_type';
import { termQuery } from '../../../../common/utils/term_query';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TRACE_ID,
} from '../../../../common/es_fields/apm';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { RollupInterval } from '../../../../common/rollup';

export async function getDownstreamServiceResource({
  traceId,
  start,
  end,
  apmEventClient,
}: {
  traceId: string;
  start: number;
  end: number;
  apmEventClient: APMEventClient;
}) {
  const response = await apmEventClient.search('get_error_group_main_statistics', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.SpanEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      track_total_hits: false,
      size: 1,
      _source: ['span.destination.service'],
      query: {
        bool: {
          filter: [
            ...termQuery(TRACE_ID, traceId),
            ...termQuery(EVENT_OUTCOME, 'failure'),
            ...rangeQuery(start, end),
            { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
          ],
        },
      },
      fields: ['span.destination.service'],
    },
  });

  const hit = response.hits.hits[0];
  return hit?.fields?.['span.destination?.service?.resource']?.[0];
}
