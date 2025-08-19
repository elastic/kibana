/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { PROCESSOR_EVENT, SERVICE_NAME, TRACE_ID } from '../../../common/es_fields/apm';

export async function getTraceSummaryCount({
  apmEventClient,
  start,
  end,
  traceId,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  traceId: string;
}) {
  const { aggregations, hits } = await apmEventClient.search(
    'observability_overview_get_service_count',
    {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          must: [
            { bool: { filter: [...termQuery(TRACE_ID, traceId), ...rangeQuery(start, end)] } },
          ],
          should: [
            { terms: { [PROCESSOR_EVENT]: [ProcessorEvent.span, ProcessorEvent.transaction] } },
            { bool: { must_not: { exists: { field: PROCESSOR_EVENT } } } },
          ],
          minimum_should_match: 1,
        },
      },
      aggs: { serviceCount: { cardinality: { field: SERVICE_NAME } } },
    },
    { skipProcessorEventFilter: true }
  );

  return { services: aggregations?.serviceCount.value || 0, traceEvents: hits.total.value };
}
