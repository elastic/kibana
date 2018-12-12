/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { createSelector } from 'reselect';
import { TimeSeriesAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/charts';
import { loadOverviewCharts } from '../../services/rest/apm/transaction_groups';
import { IReduxState } from '../rootReducer';
import { getCharts } from '../selectors/chartSelectors';
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

export const getTransactionOverviewCharts = createSelector(
  getUrlParams,
  (state: IReduxState) => state.reactReduxRequest[ID],
  (urlParams, overviewCharts = {}) => {
    return {
      ...overviewCharts,
      data: getCharts(urlParams, overviewCharts.data || INITIAL_DATA)
    };
  }
);

export function hasDynamicBaseline(state: IReduxState) {
  return (
    get(state, `reactReduxRequest[${ID}].data.anomalyTimeseries`) !== undefined
  );
}

interface Props {
  urlParams: IUrlParams;
  render: RRRRender<TimeSeriesAPIResponse>;
}

export function TransactionOverviewChartsRequest({ urlParams, render }: Props) {
  const { serviceName, start, end, transactionType, kuery } = urlParams;

  if (!(serviceName && start && end && transactionType)) {
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
