/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  METRIC_JAVA_HEAP_MEMORY_USED,
  METRIC_JAVA_NON_HEAP_MEMORY_USED,
  METRIC_JAVA_THREAD_COUNT,
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_OTEL_JVM_PROCESS_CPU_PERCENT,
  METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE,
  METRIC_OTEL_JVM_PROCESS_THREADS_COUNT,
  VALUE_OTEL_JVM_MEMORY_TYPE_HEAP,
  VALUE_OTEL_JVM_MEMORY_TYPE_NON_HEAP,
  LABEL_TYPE,
  HOST_NAME,
} from '../../../common/es_fields/apm';
import { SERVICE_NODE_NAME_MISSING } from '../../../common/service_nodes';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { SERVICE_NAME, SERVICE_NODE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { hasOTelMetrics } from './has_otel_metrics';

export type ServiceNodesResponse = Array<{
  name: string;
  cpu: number | null;
  heapMemory: number | null;
  hostName: string | null | undefined;
  nonHeapMemory: number | null;
  threadCount: number | null;
}>;

async function getServiceNodes({
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
}): Promise<ServiceNodesResponse> {
  const useOTelMetrics = await hasOTelMetrics({
    kuery,
    apmEventClient,
    serviceName,
    environment,
    start,
    end,
  });

  const serviceNodeFunc = useOTelMetrics ? getOTelServiceNodes : getElasticServiceNodes;

  return serviceNodeFunc({
    kuery,
    apmEventClient,
    serviceName,
    environment,
    start,
    end,
  });
}

async function getElasticServiceNodes({
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
}): Promise<ServiceNodesResponse> {
  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [SERVICE_NAME]: serviceName } },
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
          ...kqlQuery(kuery),
        ],
      },
    },
    aggs: {
      nodes: {
        terms: {
          field: SERVICE_NODE_NAME,
          size: 10000,
          missing: SERVICE_NODE_NAME_MISSING,
        },
        aggs: {
          latest: {
            top_metrics: {
              metrics: asMutableArray([{ field: HOST_NAME }] as const),
              sort: {
                '@timestamp': 'desc' as const,
              },
            },
          },
          cpu: {
            avg: {
              field: METRIC_PROCESS_CPU_PERCENT,
            },
          },
          heapMemory: {
            avg: {
              field: METRIC_JAVA_HEAP_MEMORY_USED,
            },
          },
          nonHeapMemory: {
            avg: {
              field: METRIC_JAVA_NON_HEAP_MEMORY_USED,
            },
          },
          threadCount: {
            max: {
              field: METRIC_JAVA_THREAD_COUNT,
            },
          },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_service_nodes', params);

  if (!response.aggregations) {
    return [];
  }

  return response.aggregations.nodes.buckets
    .map((bucket) => ({
      name: bucket.key as string,
      cpu: bucket.cpu.value,
      heapMemory: bucket.heapMemory.value,
      hostName: bucket.latest.top?.[0]?.metrics?.[HOST_NAME] as string | null | undefined,
      nonHeapMemory: bucket.nonHeapMemory.value,
      threadCount: bucket.threadCount.value,
    }))
    .filter(
      (item) =>
        item.cpu !== null ||
        item.heapMemory !== null ||
        item.nonHeapMemory !== null ||
        item.threadCount != null
    );
}

async function getOTelServiceNodes({
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
}): Promise<ServiceNodesResponse> {
  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [SERVICE_NAME]: serviceName } },
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
          ...kqlQuery(kuery),
        ],
      },
    },
    aggs: {
      nodes: {
        terms: {
          field: SERVICE_NODE_NAME,
          size: 10000,
          missing: SERVICE_NODE_NAME_MISSING,
        },
        aggs: {
          latest: {
            top_metrics: {
              metrics: asMutableArray([{ field: HOST_NAME }] as const),
              sort: {
                '@timestamp': 'desc' as const,
              },
            },
          },
          cpu: {
            avg: {
              field: METRIC_OTEL_JVM_PROCESS_CPU_PERCENT,
            },
          },
          heapMemory: {
            filter: {
              term: { [LABEL_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_HEAP },
            },
            aggs: {
              usage: {
                avg: {
                  field: METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE,
                },
              },
            },
          },
          nonHeapMemory: {
            filter: {
              term: { [LABEL_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_NON_HEAP },
            },
            aggs: {
              usage: {
                avg: {
                  field: METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE,
                },
              },
            },
          },
          threadCount: {
            max: {
              field: METRIC_OTEL_JVM_PROCESS_THREADS_COUNT,
            },
          },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_otel_service_nodes', params);

  if (!response.aggregations) {
    return [];
  }

  return response.aggregations.nodes.buckets
    .map((bucket) => ({
      name: bucket.key as string,
      cpu: bucket.cpu.value,
      heapMemory: bucket.heapMemory.usage.value,
      hostName: bucket.latest.top?.[0]?.metrics?.[HOST_NAME] as string | null | undefined,
      nonHeapMemory: bucket.nonHeapMemory.usage.value,
      threadCount: bucket.threadCount.value,
    }))
    .filter(
      (item) =>
        item.cpu !== null ||
        item.heapMemory !== null ||
        item.nonHeapMemory !== null ||
        item.threadCount != null
    );
}

export { getServiceNodes };
