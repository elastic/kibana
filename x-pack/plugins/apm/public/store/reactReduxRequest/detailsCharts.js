/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createSelector } from 'reselect';
import { getCharts } from '../selectors/chartSelectors';
import { getUrlParams } from '../urlParams';
import { withInitialData } from './helpers';
import { Request } from 'react-redux-request';
import { loadCharts } from '../../services/rest';

const ID = 'detailsCharts';
const INITIAL_DATA = {
  totalHits: 0,
  dates: [],
  responseTimes: {},
  tpmBuckets: [],
  weightedAverage: null
};

export const getDetailsCharts = createSelector(
  getUrlParams,
  state => withInitialData(state.reactReduxRequest[ID], INITIAL_DATA),
  getCharts
);

export function DetailsChartsRequest({ urlParams, render }) {
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
      selector={getDetailsCharts}
      render={render}
    />
  );
}
