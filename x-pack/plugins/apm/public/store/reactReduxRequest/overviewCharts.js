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
import { loadCharts } from '../../services/rest';
import { withInitialData } from './helpers';

const ID = 'overviewCharts';
const INITIAL_DATA = {
  totalHits: 0,
  dates: [],
  responseTimes: {},
  tpmBuckets: [],
  weightedAverage: null
};

export const getOverviewCharts = createSelector(
  getUrlParams,
  state => withInitialData(state.reactReduxRequest[ID], INITIAL_DATA),
  (urlParams, overviewCharts) => {
    return {
      ...overviewCharts,
      data: getCharts(urlParams, overviewCharts.data)
    };
  }
);

export function OverviewChartsRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionType, kuery } = urlParams;

  if (!(serviceName && start && end && transactionType)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadCharts}
      args={[{ serviceName, start, end, transactionType, kuery }]}
      selector={getOverviewCharts}
      render={render}
    />
  );
}
