/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  METRIC_CGROUP_MEMORY_USAGE_BYTES,
  METRIC_SYSTEM_CPU_PERCENT,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServiceHasSystemMetrics({
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
}): Promise<{ hasSystemMetrics: boolean }> {
  const response = await apmEventClient.search('get_service_has_system_metrics', {
    apm: { events: [ProcessorEvent.metric] },
    track_total_hits: 1,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [SERVICE_NAME]: serviceName } },
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
        ],
        should: [
          { exists: { field: METRIC_SYSTEM_CPU_PERCENT } },
          { exists: { field: METRIC_CGROUP_MEMORY_USAGE_BYTES } },
          {
            bool: {
              filter: [
                { exists: { field: METRIC_SYSTEM_FREE_MEMORY } },
                { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  });

  const total = response.hits.total;
  const count = typeof total === 'number' ? total : total.value;

  return { hasSystemMetrics: count > 0 };
}
