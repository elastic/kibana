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

type PodMetricsField =
  | 'kubernetes.pod.start_time'
  | 'kubernetes.pod.cpu.usage.node.pct'
  | 'kubernetes.pod.memory.usage.bytes';

const podMetricsMap: MetricsMap<PodMetricsField> = {
  'kubernetes.pod.start_time': {
    aggregation: 'max',
    field: 'kubernetes.pod.start_time',
  },
  'kubernetes.pod.cpu.usage.node.pct': {
    aggregation: 'avg',
    field: 'kubernetes.pod.cpu.usage.node.pct',
  },
  'kubernetes.pod.memory.usage.bytes': {
    aggregation: 'avg',
    field: 'kubernetes.pod.memory.usage.bytes',
  },
};

const { options: podMetricsOptions, metricByField } = metricsToApiOptions(
  podMetricsMap,
  'kubernetes.pod.name'
);
export { metricByField };

export interface PodNodeMetricsRow {
  name: string;
  uptime: number | null;
  averageCpuUsagePercent: number | null;
  averageMemoryUsageMegabytes: number | null;
}

export function usePodMetricsTable({ timerange, filterClauseDsl }: UseNodeMetricsTableOptions) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sortState, setSortState] = useState<SortState<PodNodeMetricsRow>>({
    field: 'averageCpuUsagePercent',
    direction: 'desc',
  });

  const {
    isLoading,
    nodes: pods,
    pageCount,
  } = useInfrastructureNodeMetrics<PodNodeMetricsRow>({
    metricsExplorerOptions: podMetricsOptions,
    timerange,
    filterClauseDsl,
    transform: seriesToPodNodeMetricsRow,
    sortState,
    currentPageIndex,
  });

  return {
    timerange,
    isLoading,
    pods,
    pageCount,
    currentPageIndex,
    setCurrentPageIndex,
    sortState,
    setSortState,
  };
}

function seriesToPodNodeMetricsRow(series: MetricsExplorerSeries): PodNodeMetricsRow {
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
  let averageMemoryUsagePercent: number = 0;
  series.rows.forEach((row) => {
    const metricValues = unpackMetrics(row);
    uptime += metricValues.uptime ?? 0;
    averageCpuUsagePercent += metricValues.averageCpuUsagePercent ?? 0;
    averageMemoryUsagePercent += metricValues.averageMemoryUsageMegabytes ?? 0;
  });

  const bucketCount = series.rows.length;
  const bytesPerMegabyte = 1000000;
  return {
    name: series.id,
    uptime: uptime / bucketCount,
    averageCpuUsagePercent: averageCpuUsagePercent / bucketCount,
    averageMemoryUsageMegabytes: Math.floor(
      averageMemoryUsagePercent / bucketCount / bytesPerMegabyte
    ),
  };
}

function unpackMetrics(row: MetricsExplorerRow): Omit<PodNodeMetricsRow, 'name'> {
  return {
    uptime: row[metricByField['kubernetes.pod.start_time']] as number | null,
    averageCpuUsagePercent: row[metricByField['kubernetes.pod.cpu.usage.node.pct']] as
      | number
      | null,
    averageMemoryUsageMegabytes: row[metricByField['kubernetes.pod.memory.usage.bytes']] as
      | number
      | null,
  };
}
