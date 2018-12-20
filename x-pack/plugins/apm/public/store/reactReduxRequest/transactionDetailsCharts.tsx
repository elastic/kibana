/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { createSelector } from 'reselect';
import { ITransactionChartData } from 'x-pack/plugins/apm/public/store/selectors/chartSelectors';
import { TimeSeriesAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/charts';
import { loadDetailsCharts } from '../../services/rest/apm/transaction_groups';
import { IReduxState } from '../rootReducer';
import { getTransactionCharts } from '../selectors/chartSelectors';
import { getUrlParams, IUrlParams } from '../urlParams';

const ID = 'transactionDetailsCharts';
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

export const getTransactionDetailsCharts = createSelector(
  getUrlParams,
  (state: IReduxState) => state.reactReduxRequest[ID],
  (urlParams, detailCharts = {}) => {
    return {
      ...detailCharts,
      data: getTransactionCharts(urlParams, detailCharts.data || INITIAL_DATA)
    };
  }
);

interface Props {
  urlParams: IUrlParams;
  render: RRRRender<ITransactionChartData>;
}

export function TransactionDetailsChartsRequest({ urlParams, render }: Props) {
  const {
    serviceName,
    start,
    end,
    transactionType,
    transactionName,
    kuery
  } = urlParams;

  if (!(serviceName && start && end && transactionType && transactionName)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadDetailsCharts}
      args={[
        { serviceName, start, end, transactionType, transactionName, kuery }
      ]}
      selector={getTransactionDetailsCharts}
      render={render}
    />
  );
}
