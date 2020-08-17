/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { values } from 'lodash';
import createContainer from 'constate';
import { useState, useEffect, useMemo, Dispatch, SetStateAction } from 'react';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';
import { MetricsExplorerColor } from '../../../../../common/color_palette';
import { metricsExplorerMetricRT } from '../../../../../common/http_api/metrics_explorer';

const metricsExplorerOptionsMetricRT = t.intersection([
  metricsExplorerMetricRT,
  t.partial({
    rate: t.boolean,
    color: t.keyof(
      Object.fromEntries(values(MetricsExplorerColor).map((c) => [c, null])) as Record<
        MetricsExplorerColor,
        null
      >
    ),
    label: t.string,
  }),
]);

export type MetricsExplorerOptionsMetric = t.TypeOf<typeof metricsExplorerOptionsMetricRT>;

export enum MetricsExplorerChartType {
  line = 'line',
  area = 'area',
  bar = 'bar',
}

export enum MetricsExplorerYAxisMode {
  fromZero = 'fromZero',
  auto = 'auto',
}

export const metricsExplorerChartOptionsRT = t.type({
  yAxisMode: t.keyof(
    Object.fromEntries(values(MetricsExplorerYAxisMode).map((v) => [v, null])) as Record<
      MetricsExplorerYAxisMode,
      null
    >
  ),
  type: t.keyof(
    Object.fromEntries(values(MetricsExplorerChartType).map((v) => [v, null])) as Record<
      MetricsExplorerChartType,
      null
    >
  ),
  stack: t.boolean,
});

export type MetricsExplorerChartOptions = t.TypeOf<typeof metricsExplorerChartOptionsRT>;

const metricExplorerOptionsRequiredRT = t.type({
  aggregation: t.string,
  metrics: t.array(metricsExplorerOptionsMetricRT),
});

const metricExplorerOptionsOptionalRT = t.partial({
  limit: t.number,
  groupBy: t.union([t.string, t.array(t.string)]),
  filterQuery: t.string,
  source: t.string,
  forceInterval: t.boolean,
  dropLastBucket: t.boolean,
});
export const metricExplorerOptionsRT = t.intersection([
  metricExplorerOptionsRequiredRT,
  metricExplorerOptionsOptionalRT,
]);

export type MetricsExplorerOptions = t.TypeOf<typeof metricExplorerOptionsRT>;

export const metricsExplorerTimeOptionsRT = t.type({
  from: t.string,
  to: t.string,
  interval: t.string,
});
export type MetricsExplorerTimeOptions = t.TypeOf<typeof metricsExplorerTimeOptionsRT>;

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
  source: 'default',
};

export const DEFAULT_METRICS_EXPLORER_VIEW_STATE = {
  options: DEFAULT_OPTIONS,
  chartOptions: DEFAULT_CHART_OPTIONS,
  currentTimerange: DEFAULT_TIMERANGE,
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

  const { metricThresholdPrefill } = useAlertPrefillContext();
  // For Jest compatibility; including metricThresholdPrefill as a dep in useEffect causes an
  // infinite loop in test environment
  const prefillContext = useMemo(() => metricThresholdPrefill, [metricThresholdPrefill]);

  useEffect(() => {
    if (prefillContext) {
      const { setPrefillOptions } = prefillContext;
      const { metrics, groupBy, filterQuery } = options;

      setPrefillOptions({ metrics, groupBy, filterQuery });
    }
  }, [options, prefillContext]);

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
