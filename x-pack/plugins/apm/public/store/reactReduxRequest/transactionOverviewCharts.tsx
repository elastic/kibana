/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { createSelector } from 'reselect';
import { ITransactionChartData } from 'x-pack/plugins/apm/public/store/selectors/chartSelectors';
import { TimeSeriesAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/charts';
import {
  loadOverviewCharts,
  loadOverviewChartsForAllTypes
} from '../../services/rest/apm/transaction_groups';
import { IReduxState } from '../rootReducer';
import { getTransactionCharts } from '../selectors/chartSelectors';
import { getUrlParams, IUrlParams } from '../urlParams';

const ID = 'transactionOverviewCharts';
const INITIAL_DATA: TimeSeriesAPIResponse = {
  apmTimeseries: {
    totalHits: 0,
    responseTimes: {
      avg: [],
      p95: [],
      p99: []
    },
    tpmBuckets: [],
    overallAvgDuration: undefined
  },
  anomalyTimeseries: undefined
};

const selectChartData = (state: IReduxState) => state.reactReduxRequest[ID];

export const getTransactionOverviewCharts = createSelector(
  [getUrlParams, selectChartData],
  (urlParams, overviewCharts = {}) => {
    return {
      ...overviewCharts,
      data: getTransactionCharts(urlParams, overviewCharts.data || INITIAL_DATA)
    };
  }
);

export const selectHasMLJob = createSelector(
  [selectChartData],
  chartData => get(chartData, 'data.anomalyTimeseries') !== undefined
);

interface Props {
  urlParams: IUrlParams;
  render: RRRRender<ITransactionChartData>;
}

export function TransactionOverviewChartsRequest({ urlParams, render }: Props) {
  const { serviceName, start, end, transactionType, kuery } = urlParams;

  if (!(serviceName && start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadOverviewCharts}
      args={[{ serviceName, start, end, transactionType, kuery }]}
      selector={getTransactionOverviewCharts}
      render={render}
    />
  );
}

// Ignores transaction type from urlParams and requests charts
// for ALL transaction types within this service
export function TransactionOverviewChartsRequestForAllTypes({
  urlParams,
  render
}: Props) {
  const { serviceName, start, end, kuery } = urlParams;

  if (!(serviceName && start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadOverviewChartsForAllTypes}
      args={[{ serviceName, start, end, kuery }]}
      selector={getTransactionOverviewCharts}
      render={render}
    />
  );
}
