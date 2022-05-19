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
    cpuCount: null,
    averageCpuUsagePercent: null,
    totalMemoryMegabytes: null,
    averageMemoryUsagePercent: null,
  };
}

function calculateMetricAverages(rows: MetricsExplorerRow[]) {
  const {
    cpuCountValues,
    averageCpuUsagePercentValues,
    totalMemoryMegabytesValues,
    averageMemoryUsagePercentValues,
  } = collectMetricValues(rows);

  let cpuCount = null;
  if (cpuCountValues.length !== 0) {
    cpuCount = averageOfValues(cpuCountValues);
  }

  let averageCpuUsagePercent = null;
  if (averageCpuUsagePercentValues.length !== 0) {
    averageCpuUsagePercent = averageOfValues(averageCpuUsagePercentValues);
  }

  let totalMemoryMegabytes = null;
  if (totalMemoryMegabytesValues.length !== 0) {
    const averageInBytes = averageOfValues(totalMemoryMegabytesValues);
    const bytesPerMegabyte = 1000000;
    totalMemoryMegabytes = Math.floor(averageInBytes / bytesPerMegabyte);
  }

  let averageMemoryUsagePercent = null;
  if (averageMemoryUsagePercentValues.length !== 0) {
    averageMemoryUsagePercent = averageOfValues(averageMemoryUsagePercentValues);
  }

  return {
    cpuCount,
    averageCpuUsagePercent,
    totalMemoryMegabytes,
    averageMemoryUsagePercent,
  };
}

function collectMetricValues(rows: MetricsExplorerRow[]) {
  const cpuCountValues: number[] = [];
  const averageCpuUsagePercentValues: number[] = [];
  const totalMemoryMegabytesValues: number[] = [];
  const averageMemoryUsagePercentValues: number[] = [];

  rows.forEach((row) => {
    const { cpuCount, averageCpuUsagePercent, totalMemoryMegabytes, averageMemoryUsagePercent } =
      unpackMetrics(row);

    if (cpuCount !== null) {
      cpuCountValues.push(cpuCount);
    }

    if (averageCpuUsagePercent !== null) {
      averageCpuUsagePercentValues.push(averageCpuUsagePercent);
    }

    if (totalMemoryMegabytes !== null) {
      totalMemoryMegabytesValues.push(totalMemoryMegabytes);
    }

    if (averageMemoryUsagePercent !== null) {
      averageMemoryUsagePercentValues.push(averageMemoryUsagePercent);
    }
  });

  return {
    cpuCountValues,
    averageCpuUsagePercentValues,
    totalMemoryMegabytesValues,
    averageMemoryUsagePercentValues,
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

function averageOfValues(values: number[]) {
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}
