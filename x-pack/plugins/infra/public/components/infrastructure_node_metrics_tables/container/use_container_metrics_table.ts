/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type {
  MetricsExplorerRow,
  MetricsExplorerSeries,
} from '../../../../common/http_api/metrics_explorer';
import type { MetricsQueryOptions, SortState, UseNodeMetricsTableOptions } from '../shared';
import {
  averageOfValues,
  createMetricByFieldLookup,
  makeUnpackMetric,
  metricsToApiOptions,
  scaleUpPercentage,
  useInfrastructureNodeMetrics,
} from '../shared';

type ContainerMetricsField =
  | 'kubernetes.container.start_time'
  | 'kubernetes.container.cpu.usage.limit.pct'
  | 'kubernetes.container.memory.usage.bytes';

const containerMetricsQueryConfig: MetricsQueryOptions<ContainerMetricsField> = {
  sourceFilter: {
    term: {
      'event.dataset': 'kubernetes.container',
    },
  },
  groupByField: 'container.id',
  metricsMap: {
    'kubernetes.container.start_time': {
      aggregation: 'max',
      field: 'kubernetes.container.start_time',
    },
    'kubernetes.container.cpu.usage.limit.pct': {
      aggregation: 'avg',
      field: 'kubernetes.container.cpu.usage.limit.pct',
    },
    'kubernetes.container.memory.usage.bytes': {
      aggregation: 'avg',
      field: 'kubernetes.container.memory.usage.bytes',
    },
  },
};

export const metricByField = createMetricByFieldLookup(containerMetricsQueryConfig.metricsMap);
const unpackMetric = makeUnpackMetric(metricByField);

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

  const { options: containerMetricsOptions } = useMemo(
    () => metricsToApiOptions(containerMetricsQueryConfig, filterClauseDsl),
    [filterClauseDsl]
  );

  const { data, isLoading } = useInfrastructureNodeMetrics<ContainerNodeMetricsRow>({
    metricsExplorerOptions: containerMetricsOptions,
    timerange,
    transform: seriesToContainerNodeMetricsRow,
    sortState,
    currentPageIndex,
  });

  return {
    data,
    isLoading,
    setCurrentPageIndex,
    setSortState,
    sortState,
    timerange,
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
): Omit<ContainerNodeMetricsRow, 'name' | 'uptime'> & { startTime: number | null } {
  return {
    startTime: unpackMetric(row, 'kubernetes.container.start_time'),
    averageCpuUsagePercent: unpackMetric(row, 'kubernetes.container.cpu.usage.limit.pct'),
    averageMemoryUsageMegabytes: unpackMetric(row, 'kubernetes.container.memory.usage.bytes'),
  };
}
