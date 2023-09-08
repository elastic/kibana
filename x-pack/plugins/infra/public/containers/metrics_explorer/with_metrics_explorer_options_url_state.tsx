/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import React, { useMemo } from 'react';
import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { UrlStateContainer } from '../../utils/url_state';
import {
  type MetricsExplorerOptions,
  type MetricsExplorerTimeOptions,
  type MetricsExplorerChartOptions,
  useMetricsExplorerOptionsContainerContext,
  metricsExplorerOptionsRT,
  metricsExplorerChartOptionsRT,
  metricsExplorerTimeOptionsRT,
} from '../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';

interface MetricsExplorerUrlState {
  timerange?: MetricsExplorerTimeOptions;
  options?: MetricsExplorerOptions;
  chartOptions?: MetricsExplorerChartOptions;
}

export const WithMetricsExplorerOptionsUrlState = () => {
  const {
    options,
    chartOptions,
    setChartOptions,
    timeRange,
    setOptions: setRawOptions,
    setTimeRange,
  } = useMetricsExplorerOptionsContainerContext();

  const setOptions = (value: MetricsExplorerOptions) => {
    setRawOptions(value);
  };

  const urlState = useMemo(
    () => ({
      options,
      chartOptions,
      timerange: timeRange,
    }),
    [options, chartOptions, timeRange]
  );

  const handleChange = (newUrlState: MetricsExplorerUrlState | undefined) => {
    if (newUrlState && newUrlState.options) {
      setOptions(newUrlState.options);
    }
    if (newUrlState && newUrlState.timerange) {
      setTimeRange(newUrlState.timerange);
    }
    if (newUrlState && newUrlState.chartOptions) {
      setChartOptions(newUrlState.chartOptions);
    }
  };

  return (
    <UrlStateContainer
      urlState={urlState}
      urlStateKey="metricsExplorer"
      mapToUrlState={mapToUrlState}
      onChange={handleChange}
      onInitialize={handleChange}
      populateWithInitialState={true}
    />
  );
};

function isMetricExplorerOptions(subject: any): subject is MetricsExplorerOptions {
  const result = metricsExplorerOptionsRT.decode(subject);

  try {
    ThrowReporter.report(result);
    return true;
  } catch (e) {
    return false;
  }
}

function isMetricExplorerChartOptions(subject: any): subject is MetricsExplorerChartOptions {
  const result = metricsExplorerChartOptionsRT.decode(subject);

  try {
    ThrowReporter.report(result);
    return true;
  } catch (e) {
    return false;
  }
}

function isMetricExplorerTimeOption(subject: any): subject is MetricsExplorerTimeOptions {
  const result = metricsExplorerTimeOptionsRT.decode(subject);
  try {
    ThrowReporter.report(result);
    return true;
  } catch (e) {
    return false;
  }
}

export const mapToUrlState = (value: any): MetricsExplorerUrlState | undefined => {
  const finalState = {};
  if (value) {
    if (value.options && isMetricExplorerOptions(value.options)) {
      value.options.source = 'url';
      set(finalState, 'options', value.options);
    }
    if (value.timerange && isMetricExplorerTimeOption(value.timerange)) {
      set(finalState, 'timerange', value.timerange);
    }
    if (value.chartOptions && isMetricExplorerChartOptions(value.chartOptions)) {
      set(finalState, 'chartOptions', value.chartOptions);
    }
    return finalState;
  }
};
