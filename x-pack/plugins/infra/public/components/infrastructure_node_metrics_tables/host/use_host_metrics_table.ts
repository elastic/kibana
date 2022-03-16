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

type HostMetricsField =
  | 'system.cpu.cores'
  | 'system.cpu.total.norm.pct'
  | 'system.memory.total'
  | 'system.memory.used.pct';

const hostMetricsMap: MetricsMap<HostMetricsField> = {
  'system.cpu.cores': { aggregation: 'max', field: 'system.cpu.cores' },
  'system.cpu.total.norm.pct': {
    aggregation: 'avg',
    field: 'system.cpu.total.norm.pct',
  },
  'system.memory.total': { aggregation: 'max', field: 'system.memory.total' },
  'system.memory.used.pct': {
    aggregation: 'avg',
    field: 'system.memory.used.pct',
  },
};

const { options: hostMetricsOptions, metricByField } = metricsToApiOptions(
  hostMetricsMap,
  'host.name'
);
export { metricByField };

export interface HostNodeMetricsRow {
  name: string;
  cpuCount: number | null;
  averageCpuUsagePercent: number | null;
  totalMemoryMegabytes: number | null;
  averageMemoryUsagePercent: number | null;
}

export function useHostMetricsTable({ timerange, filterClauseDsl }: UseNodeMetricsTableOptions) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sortState, setSortState] = useState<SortState<HostNodeMetricsRow>>({
    field: 'averageCpuUsagePercent',
    direction: 'desc',
  });

  const {
    isLoading,
    nodes: hosts,
    pageCount,
  } = useInfrastructureNodeMetrics<HostNodeMetricsRow>({
    metricsExplorerOptions: hostMetricsOptions,
    timerange,
    filterClauseDsl,
    transform: seriesToHostNodeMetricsRow,
    sortState,
    currentPageIndex,
  });

  return {
    timerange,
    isLoading,
    hosts,
    pageCount,
    currentPageIndex,
    setCurrentPageIndex,
    sortState,
    setSortState,
  };
}

function seriesToHostNodeMetricsRow(series: MetricsExplorerSeries): HostNodeMetricsRow {
  if (series.rows.length === 0) {
    return {
      name: series.id,
      cpuCount: null,
      averageCpuUsagePercent: null,
      totalMemoryMegabytes: null,
      averageMemoryUsagePercent: null,
    };
  }

  let cpuCount = 0;
  let averageCpuUsagePercent = 0;
  let totalMemoryMegabytes = 0;
  let averageMemoryUsagePercent = 0;
  series.rows.forEach((row) => {
    const metricValues = unpackMetrics(row);
    cpuCount += metricValues.cpuCount ?? 0;
    averageCpuUsagePercent += metricValues.averageCpuUsagePercent ?? 0;
    totalMemoryMegabytes += metricValues.totalMemoryMegabytes ?? 0;
    averageMemoryUsagePercent += metricValues.averageMemoryUsagePercent ?? 0;
  });

  const bucketCount = series.rows.length;
  const bytesPerMegabyte = 1000000;
  return {
    name: series.id,
    cpuCount: cpuCount / bucketCount,
    averageCpuUsagePercent: averageCpuUsagePercent / bucketCount,
    totalMemoryMegabytes: Math.floor(totalMemoryMegabytes / bucketCount / bytesPerMegabyte),
    averageMemoryUsagePercent: averageMemoryUsagePercent / bucketCount,
  };
}

function unpackMetrics(row: MetricsExplorerRow): Omit<HostNodeMetricsRow, 'name'> {
  return {
    cpuCount: row[metricByField['system.cpu.cores']] as number | null,
    averageCpuUsagePercent: row[metricByField['system.cpu.total.norm.pct']] as number | null,
    totalMemoryMegabytes: row[metricByField['system.memory.total']] as number | null,
    averageMemoryUsagePercent: row[metricByField['system.memory.used.pct']] as number | null,
  };
}
