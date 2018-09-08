/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createSelector } from 'reselect';
import { getCharts } from '../selectors/chartSelectors';
import { getUrlParams } from '../urlParams';
import { Request } from 'react-redux-request';
import { loadCharts } from '../../services/rest/apm';
import { createInitialDataSelector } from './helpers';

const ID = 'transactionDetailsCharts';
const INITIAL_DATA = {
  totalHits: 0,
  dates: [],
  responseTimes: {},
  tpmBuckets: [],
  overallAvgDuration: null
};

const withInitialData = createInitialDataSelector(INITIAL_DATA);

export const getTransactionDetailsCharts = createSelector(
  getUrlParams,
  state => withInitialData(state.reactReduxRequest[ID]),
  (urlParams, detailCharts) => {
    return {
      ...detailCharts,
      data: getCharts(urlParams, detailCharts.data)
    };
  }
);

export function TransactionDetailsChartsRequest({ urlParams, render }) {
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
      fn={loadCharts}
      args={[
        { serviceName, start, end, transactionType, transactionName, kuery }
      ]}
      selector={getTransactionDetailsCharts}
      render={render}
    />
  );
}
