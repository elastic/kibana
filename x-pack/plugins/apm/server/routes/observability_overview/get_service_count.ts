/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServiceCount({
  apmEventClient,
  searchAggregatedTransactions,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}) {
  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: rangeQuery(start, end),
        },
      },
      aggs: { serviceCount: { cardinality: { field: SERVICE_NAME } } },
    },
  };

  const { aggregations } = await apmEventClient.search(
    'observability_overview_get_service_count',
    params
  );
  return aggregations?.serviceCount.value || 0;
}
