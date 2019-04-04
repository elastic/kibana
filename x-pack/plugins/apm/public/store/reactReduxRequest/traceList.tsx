/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { createSelector } from 'reselect';
import { TraceListAPIResponse } from 'x-pack/plugins/apm/server/lib/traces/get_top_traces';
import { loadTraceList } from '../../services/rest/apm/traces';
import { IReduxState } from '../rootReducer';
import { IUrlParams } from '../urlParams';
import { createInitialDataSelector } from './helpers';

const ID = 'traceList';
const INITIAL_DATA: TraceListAPIResponse = [];
const withInitialData = createInitialDataSelector(INITIAL_DATA);

const selectRRR = (state = {} as IReduxState) => state.reactReduxRequest;

export const selectTraceList = createSelector(
  [selectRRR],
  reactReduxRequest => {
    return withInitialData(reactReduxRequest[ID]);
  }
);

interface Props {
  urlParams: IUrlParams;
  render: RRRRender<TraceListAPIResponse>;
}

export function TraceListRequest({ urlParams, render }: Props) {
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
