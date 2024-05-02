/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  METRIC_OTEL_JVM_PROCESS_CPU_PERCENT,
  METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE,
  METRIC_OTEL_JVM_PROCESS_THREADS_COUNT,
  METRIC_OTEL_SYSTEM_CPU_UTILIZATION,
  METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION,
} from '../../../common/es_fields/apm';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

const hasOTelMetrics = async ({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
}: {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
}) => {
  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            {
              bool: {
                should: [
                  { exists: { field: METRIC_OTEL_JVM_PROCESS_CPU_PERCENT } },
                  { exists: { field: METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE } },
                  { exists: { field: METRIC_OTEL_JVM_PROCESS_THREADS_COUNT } },
                  { exists: { field: METRIC_OTEL_SYSTEM_CPU_UTILIZATION } },
                  { exists: { field: METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION } },
                ],
              },
            },
          ],
        },
      },
      _source: false,
    },
  };

  const response = await apmEventClient.search('has_otel_process_metrics', params);

  return response.hits.hits.length > 0;
};

export { hasOTelMetrics };
