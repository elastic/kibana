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
import { MetricsChartAPIResponse } from 'x-pack/plugins/apm/server/lib/metrics/get_metrics_chart_data';
import { IReduxState } from '../rootReducer';
import { getMemorySeries } from '../selectors/chartSelectors';
import { IUrlParams } from '../urlParams';
import { createInitialDataSelector } from './helpers';

const ID = 'metricsChartData';
const INITIAL_DATA: MetricsChartAPIResponse = {
  memory: {
    series: {
      totalMemory: [],
      freeMemory: [],
      processMemoryRss: [],
      processMemorySize: []
    },
    overallValues: {
      totalMemory: null,
      freeMemory: null,
      processMemoryRss: null,
      processMemorySize: null
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

export const selectMemoryChartData = createSelector(
  [selectMetricsChartData],
  response => ({
    ...response,
    data: getMemorySeries(response.data.memory)
  })
);

interface Props {
  urlParams: IUrlParams;
  render: RRRRender<IMemoryChartData>;
}

export function MemoryChartDataRequest({ urlParams, render }: Props) {
  const {
    serviceName,
    start,
    end,
    transactionType,
    transactionName,
    kuery
  } = urlParams;

  if (!(serviceName && start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadMetricsChartDataForService}
      args={[
        { serviceName, start, end, transactionType, transactionName, kuery }
      ]}
      selector={selectMemoryChartData}
      render={render}
    />
  );
}
