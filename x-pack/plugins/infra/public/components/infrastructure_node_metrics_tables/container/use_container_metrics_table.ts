/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type {
  MetricsExplorerRow,
  MetricsExplorerSeries,
} from '../../../../common/http_api/metrics_explorer';
import type { MetricsQueryOptions, SortState, UseNodeMetricsTableOptions } from '../shared';
import { metricsToApiOptions, useInfrastructureNodeMetrics } from '../shared';
import { createMetricByFieldLookup } from '../shared/hooks/metrics_to_api_options';
import type { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';

type ContainerMetricsField =
  | 'kubernetes.container.start_time'
  | 'kubernetes.container.cpu.usage.node.pct'
  | 'kubernetes.container.memory.usage.bytes';

const containerMetricsQueryConfig: MetricsQueryOptions<ContainerMetricsField> = {
  sourceFilter: {
    term: {
      'event.dataset': 'kubernetes.container',
    },
  },
  groupByField: 'kubernetes.pod.name',
  metricsMap: {
    'kubernetes.container.start_time': {
      aggregation: 'max',
      field: 'kubernetes.container.start_time',
    },
    'kubernetes.container.cpu.usage.node.pct': {
      aggregation: 'avg',
      field: 'kubernetes.container.cpu.usage.node.pct',
    },
    'kubernetes.container.memory.usage.bytes': {
      aggregation: 'avg',
      field: 'kubernetes.container.memory.usage.bytes',
    },
  },
};

export const metricByField = createMetricByFieldLookup(containerMetricsQueryConfig.metricsMap);

export interface ContainerNodeMetricsRow {
  name: string;
  uptime: number | null;
  averageCpuUsagePercent: number | null;
  averageMemoryUsageMegabytes: number | null;
}

export function useContainerMetricsTable({
  timerange,
  filterClauseDsl,
}: UseNodeMetricsTableOptions) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sortState, setSortState] = useState<SortState<ContainerNodeMetricsRow>>({
    field: 'averageCpuUsagePercent',
    direction: 'desc',
  });

  const [containerMetricsOptions, setContainerMetricsOptions] = useState<MetricsExplorerOptions>();

  useEffect(() => {
    if (!containerMetricsOptions) {
      const { options } = metricsToApiOptions(containerMetricsQueryConfig, filterClauseDsl);
      setContainerMetricsOptions(options);
    }
  }, [filterClauseDsl, containerMetricsOptions]);

  const {
    isLoading,
    nodes: containers,
    pageCount,
  } = useInfrastructureNodeMetrics<ContainerNodeMetricsRow>({
    metricsExplorerOptions: containerMetricsOptions,
    timerange,
    transform: seriesToContainerNodeMetricsRow,
    sortState,
    currentPageIndex,
  });

  return {
    timerange,
    isLoading,
    containers,
    pageCount,
    currentPageIndex,
    setCurrentPageIndex,
    sortState,
    setSortState,
  };
}

function seriesToContainerNodeMetricsRow(series: MetricsExplorerSeries): ContainerNodeMetricsRow {
  if (series.rows.length === 0) {
    return rowWithoutMetrics(series.id);
  }

  return {
    name: series.id,
    ...calculateMetricAverages(series.rows),
  };
}

function rowWithoutMetrics(name: string) {
  return {
    name,
    uptime: null,
    averageCpuUsagePercent: null,
    averageMemoryUsageMegabytes: null,
  };
}

function calculateMetricAverages(rows: MetricsExplorerRow[]) {
  const { uptimeValues, averageCpuUsagePercentValues, averageMemoryUsageMegabytesValues } =
    collectMetricValues(rows);

  let uptime = null;
  if (uptimeValues.length !== 0) {
    uptime = averageOfValues(uptimeValues);
  }

  let averageCpuUsagePercent = null;
  if (averageCpuUsagePercentValues.length !== 0) {
    averageCpuUsagePercent = averageOfValues(averageCpuUsagePercentValues);
  }

  let averageMemoryUsageMegabytes = null;
  if (averageMemoryUsageMegabytesValues.length !== 0) {
    const averageInBytes = averageOfValues(averageMemoryUsageMegabytesValues);
    const bytesPerMegabyte = 1000000;
    averageMemoryUsageMegabytes = Math.floor(averageInBytes / bytesPerMegabyte);
  }

  return {
    uptime,
    averageCpuUsagePercent,
    averageMemoryUsageMegabytes,
  };
}

function collectMetricValues(rows: MetricsExplorerRow[]) {
  const uptimeValues: number[] = [];
  const averageCpuUsagePercentValues: number[] = [];
  const averageMemoryUsageMegabytesValues: number[] = [];

  rows.forEach((row) => {
    const { uptime, averageCpuUsagePercent, averageMemoryUsageMegabytes } = unpackMetrics(row);

    if (uptime !== null) {
      uptimeValues.push(uptime);
    }

    if (averageCpuUsagePercent !== null) {
      averageCpuUsagePercentValues.push(averageCpuUsagePercent);
    }

    if (averageMemoryUsageMegabytes !== null) {
      averageMemoryUsageMegabytesValues.push(averageMemoryUsageMegabytes);
    }
  });

  return {
    uptimeValues,
    averageCpuUsagePercentValues,
    averageMemoryUsageMegabytesValues,
  };
}

function unpackMetrics(row: MetricsExplorerRow): Omit<ContainerNodeMetricsRow, 'name'> {
  return {
    uptime: row[metricByField['kubernetes.container.start_time']] as number | null,
    averageCpuUsagePercent: row[metricByField['kubernetes.container.cpu.usage.node.pct']] as
      | number
      | null,
    averageMemoryUsageMegabytes: row[metricByField['kubernetes.container.memory.usage.bytes']] as
      | number
      | null,
  };
}

function averageOfValues(values: number[]) {
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}
