/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { MetricsExplorerColor } from '../../../common/color_palette';
import {
  MetricsExplorerAggregation,
  MetricsExplorerMetric,
} from '../../../common/http_api/metrics_explorer';

export type MetricsExplorerOptionsMetric = MetricsExplorerMetric & {
  color?: MetricsExplorerColor;
  label?: string;
};

export enum MetricsExplorerChartType {
  line = 'line',
  area = 'area',
  bar = 'bar',
}

export enum MetricsExplorerYAxisMode {
  fromZero = 'fromZero',
  auto = 'auto',
}

export interface MetricsExplorerChartOptions {
  type: MetricsExplorerChartType;
  yAxisMode: MetricsExplorerYAxisMode;
  stack: boolean;
}

export interface MetricsExplorerOptions {
  metrics: MetricsExplorerOptionsMetric[];
  limit?: number;
  groupBy?: string;
  filterQuery?: string;
  aggregation: MetricsExplorerAggregation;
}

export interface MetricsExplorerTimeOptions {
  from: string;
  to: string;
  interval: string;
}

export const DEFAULT_TIMERANGE: MetricsExplorerTimeOptions = {
  from: 'now-1h',
  to: 'now',
  interval: '>=10s',
};

export const DEFAULT_CHART_OPTIONS: MetricsExplorerChartOptions = {
  type: MetricsExplorerChartType.line,
  yAxisMode: MetricsExplorerYAxisMode.fromZero,
  stack: false,
};

export const DEFAULT_METRICS: MetricsExplorerOptionsMetric[] = [
  {
    aggregation: 'avg',
    field: 'system.cpu.user.pct',
    color: MetricsExplorerColor.color0,
  },
  {
    aggregation: 'avg',
    field: 'kubernetes.pod.cpu.usage.node.pct',
    color: MetricsExplorerColor.color1,
  },
  {
    aggregation: 'avg',
    field: 'docker.cpu.total.pct',
    color: MetricsExplorerColor.color2,
  },
];

export const DEFAULT_OPTIONS: MetricsExplorerOptions = {
  aggregation: 'avg',
  metrics: DEFAULT_METRICS,
};

function parseJsonOrDefault<Obj>(value: string | null, defaultValue: Obj): Obj {
  if (!value) {
    return defaultValue;
  }
  try {
    return JSON.parse(value) as Obj;
  } catch (e) {
    return defaultValue;
  }
}

function useStateWithLocalStorage<State>(
  key: string,
  defaultState: State
): [State, Dispatch<SetStateAction<State>>] {
  const storageState = localStorage.getItem(key);
  const [state, setState] = useState<State>(parseJsonOrDefault<State>(storageState, defaultState));
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState];
}

export const useMetricsExplorerOptions = () => {
  const [options, setOptions] = useStateWithLocalStorage<MetricsExplorerOptions>(
    'MetricsExplorerOptions',
    DEFAULT_OPTIONS
  );
  const [currentTimerange, setTimeRange] = useStateWithLocalStorage<MetricsExplorerTimeOptions>(
    'MetricsExplorerTimeRange',
    DEFAULT_TIMERANGE
  );
  const [chartOptions, setChartOptions] = useStateWithLocalStorage<MetricsExplorerChartOptions>(
    'MetricsExplorerChartOptions',
    DEFAULT_CHART_OPTIONS
  );
  const [isAutoReloading, setAutoReloading] = useState<boolean>(false);
  return {
    defaultViewState: {
      options: DEFAULT_OPTIONS,
      chartOptions: DEFAULT_CHART_OPTIONS,
      currentTimerange: DEFAULT_TIMERANGE,
    },
    options,
    chartOptions,
    setChartOptions,
    currentTimerange,
    isAutoReloading,
    setOptions,
    setTimeRange,
    startAutoReload: () => setAutoReloading(true),
    stopAutoReload: () => setAutoReloading(false),
  };
};

export const MetricsExplorerOptionsContainer = createContainer(useMetricsExplorerOptions);
