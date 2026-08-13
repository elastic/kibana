/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationOptionsByType } from '@kbn/es-types';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_OTEL_SYSTEM_CPU_UTILIZATION,
  METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION,
  METRIC_OTEL_JVM_PROCESS_CPU_PERCENT,
  METRIC_OTEL_JVM_SYSTEM_CPU_PERCENT,
  METRIC_JVM_CPU_RECENT_UTILIZATION,
  METRIC_OTEL_JVM_CPU_PERCENT,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../../common/es_fields/apm';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import type { Coordinate } from '../../../../typings/timeseries';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getBucketSize } from '../../../../common/utils/get_bucket_size';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import {
  systemMemory,
  cgroupMemory,
  jvmHeapMemory,
  jvmStableHeapMemory,
} from '../../metrics/by_agent/shared/memory';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';

interface ServiceInstanceSystemMetricPrimaryStatistics {
  serviceNodeName: string;
  cpuUsage: number | null;
  memoryUsage: number | null;
}

interface ServiceInstanceSystemMetricComparisonStatistics {
  serviceNodeName: string;
  cpuUsage: Coordinate[];
  memoryUsage: Coordinate[];
}

type ServiceInstanceSystemMetricStatistics<T> = T extends true
  ? ServiceInstanceSystemMetricComparisonStatistics
  : ServiceInstanceSystemMetricPrimaryStatistics;

interface AvgMetricBucket {
  avg: { value: number | null };
  timeseries?: { buckets: Array<{ key: number; avg: { value: number | null } }> };
}

interface GetServiceInstancesSystemMetricStatisticsParams<T extends true | false> {
  apmEventClient: APMEventClient;
  serviceName: string;
  start: number;
  end: number;
  numBuckets?: number;
  serviceNodeIds?: string[];
  environment: string;
  kuery: string;
  size?: number;
  includeTimeseries: T;
  offset?: string;
}

const otelSystemCpuFilter = { exists: { field: METRIC_OTEL_SYSTEM_CPU_UTILIZATION } };
const otelSystemMemoryFilter = { exists: { field: METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION } };
const jvmSystemCpuFilter = { exists: { field: METRIC_OTEL_JVM_SYSTEM_CPU_PERCENT } };
const jvmProcessCpuFilter = { exists: { field: METRIC_OTEL_JVM_PROCESS_CPU_PERCENT } };
const jvmStableCpuFilter = { exists: { field: METRIC_JVM_CPU_RECENT_UTILIZATION } };
const jvmMetricsPrefixedCpuFilter = { exists: { field: METRIC_OTEL_JVM_CPU_PERCENT } };
const classicCpuFilter = { exists: { field: METRIC_PROCESS_CPU_PERCENT } };

function withTimeseriesFactory<TParams extends AggregationOptionsByType['avg']>(
  includeTimeseries: boolean,
  intervalString: string,
  startWithOffset: number,
  endWithOffset: number
) {
  return (agg: TParams) => ({
    ...(includeTimeseries
      ? {
          avg: { avg: agg },
          timeseries: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: intervalString,
              min_doc_count: 0,
              extended_bounds: {
                min: startWithOffset,
                max: endWithOffset,
              },
            },
            aggs: { avg: { avg: agg } },
          },
        }
      : { avg: { avg: agg } }),
  });
}

function getAvgOrTimeseries(metricBucket: AvgMetricBucket): number | null | Coordinate[] {
  return 'timeseries' in metricBucket && metricBucket.timeseries
    ? metricBucket.timeseries.buckets.map((dateBucket) => ({
        x: dateBucket.key,
        y: dateBucket.avg.value,
      }))
    : metricBucket.avg.value;
}

function firstAvailableMetric(...metricBuckets: AvgMetricBucket[]): number | null | Coordinate[] {
  for (const metricBucket of metricBuckets) {
    const value = getAvgOrTimeseries(metricBucket);
    const isAvailable = Array.isArray(value)
      ? value.some((coordinate) => coordinate.y !== null)
      : value !== null;
    if (isAvailable) {
      return value;
    }
  }

  const lastBucket = metricBuckets[metricBuckets.length - 1];
  return lastBucket ? getAvgOrTimeseries(lastBucket) : null;
}

export async function getServiceInstancesSystemMetricStatistics<T extends true | false>({
  environment,
  kuery,
  apmEventClient,
  serviceName,
  size,
  start,
  end,
  serviceNodeIds,
  numBuckets,
  includeTimeseries,
  offset,
}: GetServiceInstancesSystemMetricStatisticsParams<T>): Promise<
  Array<ServiceInstanceSystemMetricStatistics<T>>
> {
  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString } = getBucketSize({
    start: startWithOffset,
    end: endWithOffset,
    numBuckets,
  });

  const withTimeseries = withTimeseriesFactory(
    includeTimeseries,
    intervalString,
    startWithOffset,
    endWithOffset
  );

  const response = await apmEventClient.search(
    'get_service_instances_system_metric_statistics',
    {
      apm: {
        events: [ProcessorEvent.metric],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(startWithOffset, endWithOffset),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...(serviceNodeIds?.length ? [{ terms: { [SERVICE_NODE_NAME]: serviceNodeIds } }] : []),
            {
              bool: {
                should: [
                  otelSystemCpuFilter,
                  otelSystemMemoryFilter,
                  jvmSystemCpuFilter,
                  jvmProcessCpuFilter,
                  jvmStableCpuFilter,
                  jvmMetricsPrefixedCpuFilter,
                  jvmHeapMemory.filter,
                  jvmStableHeapMemory.filter,
                  cgroupMemory.filter,
                  systemMemory.filter,
                  classicCpuFilter,
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      aggs: {
        [SERVICE_NODE_NAME]: {
          terms: {
            field: SERVICE_NODE_NAME,
            missing: SERVICE_NODE_NAME_MISSING,
            ...(size ? { size } : {}),
            ...(serviceNodeIds?.length ? { include: serviceNodeIds } : {}),
          },
          aggs: {
            // Preference:
            // host SemConv → process.runtime.jvm.* → stable jvm.* / metrics.jvm.* → classic ECS
            cpu_usage_otel_system: {
              filter: otelSystemCpuFilter,
              aggs: withTimeseries({ field: METRIC_OTEL_SYSTEM_CPU_UTILIZATION }),
            },
            cpu_usage_jvm_system: {
              filter: jvmSystemCpuFilter,
              aggs: withTimeseries({ field: METRIC_OTEL_JVM_SYSTEM_CPU_PERCENT }),
            },
            cpu_usage_jvm_process: {
              filter: jvmProcessCpuFilter,
              aggs: withTimeseries({ field: METRIC_OTEL_JVM_PROCESS_CPU_PERCENT }),
            },
            cpu_usage_jvm_stable: {
              filter: jvmStableCpuFilter,
              aggs: withTimeseries({ field: METRIC_JVM_CPU_RECENT_UTILIZATION }),
            },
            cpu_usage_jvm_metrics_prefixed: {
              filter: jvmMetricsPrefixedCpuFilter,
              aggs: withTimeseries({ field: METRIC_OTEL_JVM_CPU_PERCENT }),
            },
            cpu_usage: {
              filter: classicCpuFilter,
              aggs: withTimeseries({ field: METRIC_PROCESS_CPU_PERCENT }),
            },
            memory_usage_otel_system: {
              filter: otelSystemMemoryFilter,
              aggs: withTimeseries({ field: METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION }),
            },
            memory_usage_jvm_heap: {
              filter: jvmHeapMemory.filter,
              aggs: withTimeseries({ script: jvmHeapMemory.script }),
            },
            memory_usage_jvm_stable_heap: {
              filter: jvmStableHeapMemory.filter,
              aggs: withTimeseries({ script: jvmStableHeapMemory.script }),
            },
            memory_usage_cgroup: {
              filter: cgroupMemory.filter,
              aggs: withTimeseries({ script: cgroupMemory.script }),
            },
            memory_usage_system: {
              filter: systemMemory.filter,
              aggs: withTimeseries({ script: systemMemory.script }),
            },
          },
        },
      },
    },
    // OTel-native metrics (e.g. metrics-*.otel-*) often omit processor.event.
    // Metrics Lens dashboards already query those indices without this filter.
    { skipProcessorEventFilter: true }
  );

  return (
    (response.aggregations?.[SERVICE_NODE_NAME].buckets.map((serviceNodeBucket) => {
      return {
        serviceNodeName: String(serviceNodeBucket.key),
        cpuUsage: firstAvailableMetric(
          serviceNodeBucket.cpu_usage_otel_system,
          serviceNodeBucket.cpu_usage_jvm_system,
          serviceNodeBucket.cpu_usage_jvm_process,
          serviceNodeBucket.cpu_usage_jvm_stable,
          serviceNodeBucket.cpu_usage_jvm_metrics_prefixed,
          serviceNodeBucket.cpu_usage
        ),
        memoryUsage: firstAvailableMetric(
          serviceNodeBucket.memory_usage_otel_system,
          serviceNodeBucket.memory_usage_jvm_heap,
          serviceNodeBucket.memory_usage_jvm_stable_heap,
          serviceNodeBucket.memory_usage_cgroup,
          serviceNodeBucket.memory_usage_system
        ),
      };
    }) as Array<ServiceInstanceSystemMetricStatistics<T>>) || []
  );
}
