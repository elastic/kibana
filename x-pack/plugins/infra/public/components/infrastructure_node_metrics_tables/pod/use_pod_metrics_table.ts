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
import {
  averageOfValues,
  makeUnpackMetric,
  MetricsMap,
  metricsToApiOptions,
  scaleUpPercentage,
  SortState,
  useInfrastructureNodeMetrics,
  UseNodeMetricsTableOptions,
} from '../shared';

type PodMetricsField =
  | 'kubernetes.pod.start_time'
  | 'kubernetes.pod.cpu.usage.limit.pct'
  | 'kubernetes.pod.memory.usage.bytes';

const podMetricsMap: MetricsMap<PodMetricsField> = {
  'kubernetes.pod.start_time': {
    aggregation: 'max',
    field: 'kubernetes.pod.start_time',
  },
  'kubernetes.pod.cpu.usage.limit.pct': {
    aggregation: 'avg',
    field: 'kubernetes.pod.cpu.usage.limit.pct',
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
const unpackMetric = makeUnpackMetric(metricByField);
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
  const { startTimeValues, averageCpuUsagePercentValues, averageMemoryUsageMegabytesValues } =
    collectMetricValues(rows);

  let uptime = null;
  if (startTimeValues.length !== 0) {
    const startTime = startTimeValues.at(-1);
    uptime = Date.now() - startTime!;
  }

  let averageCpuUsagePercent = null;
  if (averageCpuUsagePercentValues.length !== 0) {
    averageCpuUsagePercent = scaleUpPercentage(averageOfValues(averageCpuUsagePercentValues));
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
  const startTimeValues: number[] = [];
  const averageCpuUsagePercentValues: number[] = [];
  const averageMemoryUsageMegabytesValues: number[] = [];

  rows.forEach((row) => {
    const { startTime, averageCpuUsagePercent, averageMemoryUsageMegabytes } = unpackMetrics(row);

    if (startTime !== null) {
      startTimeValues.push(startTime);
    }

    if (averageCpuUsagePercent !== null) {
      averageCpuUsagePercentValues.push(averageCpuUsagePercent);
    }

    if (averageMemoryUsageMegabytes !== null) {
      averageMemoryUsageMegabytesValues.push(averageMemoryUsageMegabytes);
    }
  });

  return {
    startTimeValues,
    averageCpuUsagePercentValues,
    averageMemoryUsageMegabytesValues,
  };
}

function unpackMetrics(
  row: MetricsExplorerRow
): Omit<PodNodeMetricsRow, 'name' | 'uptime'> & { startTime: number | null } {
  return {
    startTime: unpackMetric(row, 'kubernetes.pod.start_time'),
    averageCpuUsagePercent: unpackMetric(row, 'kubernetes.pod.cpu.usage.limit.pct'),
    averageMemoryUsageMegabytes: unpackMetric(row, 'kubernetes.pod.memory.usage.bytes'),
  };
}
