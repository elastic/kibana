/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { ServerStatusAPIResponse } from 'x-pack/plugins/apm/server/lib/status_check/server_check';
import { loadServerStatus } from '../../services/rest/apm/status_check';
import { IReduxState } from '../rootReducer';
import { createInitialDataSelector } from './helpers';

const ID = 'serverStatus';
const INITIAL_DATA: ServerStatusAPIResponse = {
  dataFound: false,
  latest: null
};
const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function selectServerStatus(state: IReduxState) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function ServerStatusCheck({
  render
}: {
  render: RRRRender<ServerStatusAPIResponse>;
}) {
  return (
    <Request
      id={ID}
      fn={loadServerStatus}
      selector={selectServerStatus}
      render={render}
    />
  );
}
