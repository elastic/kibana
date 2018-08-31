/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createSelector } from 'reselect';
import { Request } from 'react-redux-request';
import { createInitialDataSelector } from './helpers';
import mockTraceList from '../mockData/mockTraceList.json';

const ID = 'traceList';
const INITIAL_DATA = [];
const withInitialData = createInitialDataSelector(INITIAL_DATA);

const selectRRR = (state = {}) => state.reactReduxRequest;

export const selectTraceList = createSelector(
  [selectRRR],
  reactReduxRequest => {
    return withInitialData(reactReduxRequest[ID]);
  }
);

function loadMockTraces() {
  return Promise.resolve(mockTraceList);
}

export function TraceListRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionType, kuery } = urlParams;

  // if (!(serviceName && start && end && transactionType)) {
  //   return null;
  // }

  return (
    <Request
      id={ID}
      fn={loadMockTraces}
      args={[
        {
          serviceName,
          start,
          end,
          transactionType,
          kuery
        }
      ]}
      selector={selectTraceList}
      render={render}
    />
  );
}
