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

type PodMetricsField =
  | 'kubernetes.pod.start_time'
  | 'kubernetes.pod.cpu.usage.node.pct'
  | 'kubernetes.pod.memory.usage.bytes';

const podMetricsQueryConfig: MetricsQueryOptions<PodMetricsField> = {
  sourceFilter: {
    term: {
      'event.dataset': 'kubernetes.pod',
    },
  },
  groupByField: 'kubernetes.pod.name',
  metricsMap: {
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
  },
};

export const metricByField = createMetricByFieldLookup(podMetricsQueryConfig.metricsMap);

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
  const [podMetricsOptions, setPodMetricsOptions] = useState<MetricsExplorerOptions>();

  useEffect(() => {
    if (!podMetricsOptions) {
      const { options } = metricsToApiOptions(podMetricsQueryConfig, filterClauseDsl);
      setPodMetricsOptions(options);
    }
  }, [filterClauseDsl, podMetricsOptions]);

  const {
    isLoading,
    nodes: pods,
    pageCount,
  } = useInfrastructureNodeMetrics<PodNodeMetricsRow>({
    metricsExplorerOptions: podMetricsOptions,
    timerange,
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

function averageOfValues(values: number[]) {
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}
