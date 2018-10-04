/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request } from 'react-redux-request';
import { createSelector } from 'reselect';
import { loadTraceList } from '../../services/rest/apm';
import { createInitialDataSelector } from './helpers';

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

export function TraceListRequest({ urlParams = {}, render }) {
  const { start, end, kuery } = urlParams;

  if (!start || !end) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadTraceList}
      args={[
        {
          start,
          end,
          kuery
        }
      ]}
      selector={selectTraceList}
      render={render}
    />
  );
}
