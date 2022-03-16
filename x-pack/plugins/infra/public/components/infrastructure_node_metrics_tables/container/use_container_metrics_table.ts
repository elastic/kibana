/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type {
  MetricsExplorerRow,
  MetricsExplorerSeries,
} from '../../../../common/http_api/metrics_explorer';
import type { MetricsMap, SortState, UseNodeMetricsTableOptions } from '../shared';
import { metricsToApiOptions, useInfrastructureNodeMetrics } from '../shared';

type ContainerMetricsField =
  | 'kubernetes.container.start_time'
  | 'kubernetes.container.cpu.usage.node.pct'
  | 'kubernetes.container.memory.usage.bytes';

const containerMetricsMap: MetricsMap<ContainerMetricsField> = {
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
};

const { options: containerMetricsOptions, metricByField } = metricsToApiOptions(
  containerMetricsMap,
  'container.id'
);
export { metricByField };

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

  const {
    isLoading,
    nodes: containers,
    pageCount,
  } = useInfrastructureNodeMetrics<ContainerNodeMetricsRow>({
    metricsExplorerOptions: containerMetricsOptions,
    timerange,
    filterClauseDsl,
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
    return {
      name: series.id,
      uptime: null,
      averageCpuUsagePercent: null,
      averageMemoryUsageMegabytes: null,
    };
  }

  let uptime: number = 0;
  let averageCpuUsagePercent: number = 0;
  let averageMemoryUsageMegabytes: number = 0;
  series.rows.forEach((row) => {
    const metricValues = unpackMetrics(row);
    uptime += metricValues.uptime ?? 0;
    averageCpuUsagePercent += metricValues.averageCpuUsagePercent ?? 0;
    averageMemoryUsageMegabytes += metricValues.averageMemoryUsageMegabytes ?? 0;
  });

  const bucketCount = series.rows.length;
  const bytesPerMegabyte = 1000000;
  return {
    name: series.id,
    uptime: uptime / bucketCount,
    averageCpuUsagePercent: averageCpuUsagePercent / bucketCount,
    averageMemoryUsageMegabytes: Math.floor(
      averageMemoryUsageMegabytes / bucketCount / bytesPerMegabyte
    ),
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
