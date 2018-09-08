/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createSelector } from 'reselect';
import { get, isEmpty } from 'lodash';
import { getCharts } from '../selectors/chartSelectors';
import { getUrlParams } from '../urlParams';
import { Request } from 'react-redux-request';
import { loadCharts } from '../../services/rest/apm';

const ID = 'transactionOverviewCharts';
const INITIAL_DATA = {
  totalHits: 0,
  dates: [],
  responseTimes: {},
  tpmBuckets: [],
  overallAvgDuration: null
};

export const getTransactionOverviewCharts = createSelector(
  getUrlParams,
  state => state.reactReduxRequest[ID],
  (urlParams, overviewCharts = {}) => {
    return {
      ...overviewCharts,
      data: getCharts(urlParams, overviewCharts.data || INITIAL_DATA)
    };
  }
);

export function hasDynamicBaseline(state) {
  return !isEmpty(
    get(
      state,
      `reactReduxRequest[${ID}].data.responseTimes.avgAnomalies.buckets`
    )
  );
}

export function TransactionOverviewChartsRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionType, kuery } = urlParams;

  if (!(serviceName && start && end && transactionType)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadCharts}
      args={[{ serviceName, start, end, transactionType, kuery }]}
      selector={getTransactionOverviewCharts}
      render={render}
    />
  );
}
