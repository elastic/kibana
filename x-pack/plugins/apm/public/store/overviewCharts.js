/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createSelector } from 'reselect';
import { getCharts } from './selectors/chartSelectors';
import { getUrlParams } from './urlParams';
import { withInitialData } from './selectorHelpers';
import { ReduxRequest } from '../components/shared/ReduxRequest';
import { loadCharts } from '../services/rest';

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
  state => withInitialData(state.reduxRequest[ID], INITIAL_DATA),
  getCharts
);

export function OverviewChartsRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionType, kuery } = urlParams;
  return (
    <ReduxRequest
      id={ID}
      shouldInvoke={Boolean(serviceName && start && end && transactionType)}
      fn={loadCharts}
      args={[{ serviceName, start, end, transactionType, kuery }]}
      selector={getOverviewCharts}
      render={render}
    />
  );
}
