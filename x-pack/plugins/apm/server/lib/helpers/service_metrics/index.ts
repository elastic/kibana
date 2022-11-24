/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { METRICSET_NAME } from '../../../../common/es_fields/apm';
import { APMEventClient } from '../create_es_client/create_apm_event_client';

export async function getSearchServiceMetrics({
  serviceMetricsEnabled,
  start,
  end,
  apmEventClient,
  kuery,
}: {
  serviceMetricsEnabled: boolean;
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
  kuery: string;
}): Promise<boolean> {
  if (serviceMetricsEnabled) {
    return getHasServicesMetrics({
      start,
      end,
      apmEventClient,
      kuery,
    });
  }

  return false;
}

export async function getHasServicesMetrics({
  start,
  end,
  apmEventClient,
  kuery,
}: {
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
  kuery: string;
}) {
  const response = await apmEventClient.search(
    'get_has_aggregated_service_metrics',
    {
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        track_total_hits: 1,
        size: 0,
        query: {
          bool: {
            filter: [
              ...getDocumentTypeFilterForServiceMetrics(),
              ...(start && end ? rangeQuery(start, end) : []),
              ...kqlQuery(kuery),
            ],
          },
        },
      },
      terminate_after: 1,
    }
  );

  return response.hits.total.value > 0;
}

export function getDocumentTypeFilterForServiceMetrics() {
  return [
    {
      term: {
        [METRICSET_NAME]: 'service',
      },
    },
  ];
}
