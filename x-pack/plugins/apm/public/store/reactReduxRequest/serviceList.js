/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { loadServiceList } from '../../services/rest/apm';
import { Request } from 'react-redux-request';
import { createInitialDataSelector } from './helpers';

const ID = 'serviceList';
const INITIAL_DATA = [];
const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function getServiceList(state) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function ServiceListRequest({ urlParams, render }) {
  const { start, end, kuery } = urlParams;

  if (!(start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadServiceList}
      args={[{ start, end, kuery }]}
      selector={getServiceList}
      render={render}
    />
  );
}
