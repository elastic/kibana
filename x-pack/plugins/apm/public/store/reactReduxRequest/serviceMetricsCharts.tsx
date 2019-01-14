/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender, RRRRenderResponse } from 'react-redux-request';
import { createSelector } from 'reselect';
import { loadMetricsChartDataForService } from 'x-pack/plugins/apm/public/services/rest/apm/metrics';
import { IMemoryChartData } from 'x-pack/plugins/apm/public/store/selectors/chartSelectors';
import { MetricsChartAPIResponse } from 'x-pack/plugins/apm/server/lib/metrics/get_all_metrics_chart_data';
import { IReduxState } from '../rootReducer';
import { getCPUSeries, getMemorySeries } from '../selectors/chartSelectors';
import { getUrlParams, IUrlParams } from '../urlParams';
import { createInitialDataSelector } from './helpers';

const ID = 'metricsChartData';
const INITIAL_DATA: MetricsChartAPIResponse = {
  memory: {
    series: {
      averagePercentMemoryUsed: [],
      maximumPercentMemoryUsed: []
    },
    overallValues: {
      averagePercentMemoryUsed: null,
      maximumPercentMemoryUsed: null
    },
    totalHits: 0
  },
  cpu: {
    series: {
      systemCPUAverage: [],
      systemCPUMax: [],
      processCPUAverage: [],
      processCPUMax: []
    },
    overallValues: {
      systemCPUAverage: null,
      systemCPUMax: null,
      processCPUAverage: null,
      processCPUMax: null
    },
    totalHits: 0
  }
};

type MetricsChartDataSelector = (
  state: IReduxState
) => RRRRenderResponse<MetricsChartAPIResponse>;

const withInitialData = createInitialDataSelector<MetricsChartAPIResponse>(
  INITIAL_DATA
);

const selectMetricsChartData: MetricsChartDataSelector = state =>
  withInitialData(state.reactReduxRequest[ID]);

export const selectTransformedMetricsChartData = createSelector(
  [getUrlParams, selectMetricsChartData],
  (urlParams, response) => ({
    ...response,
    data: {
      ...response.data,
      memory: getMemorySeries(urlParams, response.data.memory),
      cpu: getCPUSeries(response.data.cpu)
    }
  })
);

interface Props {
  urlParams: IUrlParams;
  render: RRRRender<IMemoryChartData>;
}

export function MetricsChartDataRequest({ urlParams, render }: Props) {
  const { serviceName, start, end } = urlParams;

  if (!(serviceName && start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadMetricsChartDataForService}
      args={[urlParams]}
      selector={selectTransformedMetricsChartData}
      render={render}
    />
  );
}
