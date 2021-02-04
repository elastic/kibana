/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationOptionsByType } from '../../../../../../typings/elasticsearch';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import {
  METRIC_CGROUP_MEMORY_USAGE_BYTES,
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { ServiceInstanceParams } from '.';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  percentCgroupMemoryUsedScript,
  percentSystemMemoryUsedScript,
} from '../../metrics/by_agent/shared/memory';
import { getEnvironmentFilter } from '../../helpers/get_environment_filter';

export async function getServiceInstanceSystemMetricStats({
  environment,
  setup,
  serviceName,
  size,
  numBuckets,
}: ServiceInstanceParams) {
  const { apmEventClient, start, end, esFilter } = setup;

  const { intervalString } = getBucketSize({ start, end, numBuckets });

  const systemMemoryFilter = {
    bool: {
      filter: [
        { exists: { field: METRIC_SYSTEM_FREE_MEMORY } },
        { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
      ],
    },
  };

  const cgroupMemoryFilter = {
    exists: { field: METRIC_CGROUP_MEMORY_USAGE_BYTES },
  };

  const cpuUsageFilter = { exists: { field: METRIC_PROCESS_CPU_PERCENT } };

  function withTimeseries<T extends AggregationOptionsByType['avg']>(agg: T) {
    return {
      avg: { avg: agg },
      timeseries: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: intervalString,
          min_doc_count: 0,
          extended_bounds: {
            min: start,
            max: end,
          },
        },
        aggs: {
          avg: { avg: agg },
        },
      },
    };
  }

  const subAggs = {
    memory_usage_cgroup: {
      filter: cgroupMemoryFilter,
      aggs: withTimeseries({ script: percentCgroupMemoryUsedScript }),
    },
    memory_usage_system: {
      filter: systemMemoryFilter,
      aggs: withTimeseries({ script: percentSystemMemoryUsedScript }),
    },
    cpu_usage: {
      filter: cpuUsageFilter,
      aggs: withTimeseries({ field: METRIC_PROCESS_CPU_PERCENT }),
    },
  };

  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: rangeFilter(start, end) },
            { term: { [SERVICE_NAME]: serviceName } },
            ...getEnvironmentFilter(environment),
            ...esFilter,
          ],
          should: [cgroupMemoryFilter, systemMemoryFilter, cpuUsageFilter],
          minimum_should_match: 1,
        },
      },
      aggs: {
        [SERVICE_NODE_NAME]: {
          terms: {
            field: SERVICE_NODE_NAME,
            missing: SERVICE_NODE_NAME_MISSING,
            size,
          },
          aggs: subAggs,
        },
      },
    },
  });

  return (
    response.aggregations?.[SERVICE_NODE_NAME].buckets.map(
      (serviceNodeBucket) => {
        const hasCGroupData =
          serviceNodeBucket.memory_usage_cgroup.avg.value !== null;

        const memoryMetricsKey = hasCGroupData
          ? 'memory_usage_cgroup'
          : 'memory_usage_system';

        return {
          serviceNodeName: String(serviceNodeBucket.key),
          cpuUsage: {
            value: serviceNodeBucket.cpu_usage.avg.value,
            timeseries: serviceNodeBucket.cpu_usage.timeseries.buckets.map(
              (dateBucket) => ({
                x: dateBucket.key,
                y: dateBucket.avg.value,
              })
            ),
          },
          memoryUsage: {
            value: serviceNodeBucket[memoryMetricsKey].avg.value,
            timeseries: serviceNodeBucket[
              memoryMetricsKey
            ].timeseries.buckets.map((dateBucket) => ({
              x: dateBucket.key,
              y: dateBucket.avg.value,
            })),
          },
        };
      }
    ) ?? []
  );
}
