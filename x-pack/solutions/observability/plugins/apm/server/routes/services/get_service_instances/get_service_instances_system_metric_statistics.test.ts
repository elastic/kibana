/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import {
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_OTEL_SYSTEM_CPU_UTILIZATION,
  METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION,
  METRIC_OTEL_JVM_PROCESS_CPU_PERCENT,
  METRIC_OTEL_JVM_SYSTEM_CPU_PERCENT,
  METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE,
  METRIC_OTEL_JVM_PROCESS_MEMORY_LIMIT,
  METRIC_JVM_CPU_RECENT_UTILIZATION,
  METRIC_OTEL_JVM_CPU_PERCENT,
  METRIC_JVM_MEMORY_USED,
  METRIC_JVM_MEMORY_LIMIT,
  METRIC_JVM_MEMORY_TYPE,
  LABEL_TYPE,
  VALUE_OTEL_JVM_MEMORY_TYPE_HEAP,
} from '../../../../common/es_fields/apm';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getServiceInstancesSystemMetricStatistics } from './get_service_instances_system_metric_statistics';

type SearchMock = jest.Mock<Promise<unknown>>;

const start = 1_700_000_000_000;
const end = 1_700_000_900_000;

const baseParams = {
  serviceName: 'my-service',
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
  start,
  end,
  includeTimeseries: false as const,
};

function emptyAvg() {
  return { avg: { value: null } };
}

function aggregationResponse(overrides: Record<string, { avg: { value: number | null } }> = {}) {
  return {
    aggregations: {
      'service.node.name': {
        buckets: [
          {
            key: 'instance-1',
            cpu_usage_otel_system: emptyAvg(),
            cpu_usage_jvm_system: emptyAvg(),
            cpu_usage_jvm_process: emptyAvg(),
            cpu_usage_jvm_stable: emptyAvg(),
            cpu_usage_jvm_metrics_prefixed: emptyAvg(),
            cpu_usage: emptyAvg(),
            memory_usage_otel_system: emptyAvg(),
            memory_usage_jvm_heap: emptyAvg(),
            memory_usage_jvm_stable_heap: emptyAvg(),
            memory_usage_cgroup: emptyAvg(),
            memory_usage_system: emptyAvg(),
            ...overrides,
          },
        ],
      },
    },
  };
}

function getSearchParams(search: SearchMock, callIndex = 0) {
  return search.mock.calls[callIndex]?.[1];
}

describe('getServiceInstancesSystemMetricStatistics', () => {
  it('queries host SemConv, JVM field variants, and classic ECS together', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(aggregationResponse());
    const apmEventClient = { search } as unknown as APMEventClient;

    await getServiceInstancesSystemMetricStatistics({
      ...baseParams,
      apmEventClient,
    });

    expect(search).toHaveBeenCalledWith(
      'get_service_instances_system_metric_statistics',
      expect.any(Object),
      { skipProcessorEventFilter: true }
    );

    const aggs = getSearchParams(search).aggs['service.node.name'].aggs;

    expect(aggs.cpu_usage_otel_system.filter).toEqual({
      exists: { field: METRIC_OTEL_SYSTEM_CPU_UTILIZATION },
    });
    expect(aggs.cpu_usage_jvm_system.filter).toEqual({
      exists: { field: METRIC_OTEL_JVM_SYSTEM_CPU_PERCENT },
    });
    expect(aggs.cpu_usage_jvm_process.filter).toEqual({
      exists: { field: METRIC_OTEL_JVM_PROCESS_CPU_PERCENT },
    });
    expect(aggs.cpu_usage_jvm_stable.filter).toEqual({
      exists: { field: METRIC_JVM_CPU_RECENT_UTILIZATION },
    });
    expect(aggs.cpu_usage_jvm_metrics_prefixed.filter).toEqual({
      exists: { field: METRIC_OTEL_JVM_CPU_PERCENT },
    });
    expect(aggs.cpu_usage.filter).toEqual({ exists: { field: METRIC_PROCESS_CPU_PERCENT } });
    expect(aggs.memory_usage_otel_system.filter).toEqual({
      exists: { field: METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION },
    });
    expect(aggs.memory_usage_jvm_heap.filter).toEqual({
      bool: {
        filter: [
          { term: { [LABEL_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_HEAP } },
          { exists: { field: METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE } },
          { exists: { field: METRIC_OTEL_JVM_PROCESS_MEMORY_LIMIT } },
        ],
      },
    });
    expect(aggs.memory_usage_jvm_stable_heap.filter).toEqual({
      bool: {
        filter: [
          { term: { [METRIC_JVM_MEMORY_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_HEAP } },
          { exists: { field: METRIC_JVM_MEMORY_USED } },
          { exists: { field: METRIC_JVM_MEMORY_LIMIT } },
        ],
      },
    });
    expect(aggs.memory_usage_cgroup).toBeDefined();
    expect(aggs.memory_usage_system).toBeDefined();
  });

  it('prefers host SemConv over JVM and classic fields', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(
      aggregationResponse({
        cpu_usage_otel_system: { avg: { value: 0.31 } },
        cpu_usage_jvm_stable: { avg: { value: 0.9 } },
        cpu_usage: { avg: { value: 0.1 } },
        memory_usage_otel_system: { avg: { value: 0.67 } },
        memory_usage_jvm_stable_heap: { avg: { value: 0.2 } },
        memory_usage_system: { avg: { value: 0.4 } },
      })
    );
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getServiceInstancesSystemMetricStatistics({
      ...baseParams,
      apmEventClient,
    });

    expect(result).toEqual([
      {
        serviceNodeName: 'instance-1',
        cpuUsage: 0.31,
        memoryUsage: 0.67,
      },
    ]);
  });

  it('falls back to process.runtime.jvm fields when host SemConv is missing', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(
      aggregationResponse({
        cpu_usage_jvm_system: { avg: { value: 0.25 } },
        memory_usage_jvm_heap: { avg: { value: 0.48 } },
        cpu_usage_jvm_stable: { avg: { value: 0.9 } },
        memory_usage_jvm_stable_heap: { avg: { value: 0.2 } },
        cpu_usage: { avg: { value: 0.1 } },
        memory_usage_system: { avg: { value: 0.4 } },
      })
    );
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getServiceInstancesSystemMetricStatistics({
      ...baseParams,
      apmEventClient,
    });

    expect(result).toEqual([
      {
        serviceNodeName: 'instance-1',
        cpuUsage: 0.25,
        memoryUsage: 0.48,
      },
    ]);
  });

  it('falls back to stable jvm.* fields when process.runtime.jvm is missing', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(
      aggregationResponse({
        cpu_usage_jvm_stable: { avg: { value: 0.26 } },
        memory_usage_jvm_stable_heap: { avg: { value: 0.334 } },
        cpu_usage: { avg: { value: 0.1 } },
        memory_usage_system: { avg: { value: 0.4 } },
      })
    );
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getServiceInstancesSystemMetricStatistics({
      ...baseParams,
      apmEventClient,
    });

    expect(result).toEqual([
      {
        serviceNodeName: 'instance-1',
        cpuUsage: 0.26,
        memoryUsage: 0.334,
      },
    ]);
  });

  it('falls back to classic ECS when SemConv fields are missing', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(
      aggregationResponse({
        cpu_usage: { avg: { value: 0.42 } },
        memory_usage_system: { avg: { value: 0.55 } },
      })
    );
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getServiceInstancesSystemMetricStatistics({
      ...baseParams,
      apmEventClient,
    });

    expect(result).toEqual([
      {
        serviceNodeName: 'instance-1',
        cpuUsage: 0.42,
        memoryUsage: 0.55,
      },
    ]);
  });
});
