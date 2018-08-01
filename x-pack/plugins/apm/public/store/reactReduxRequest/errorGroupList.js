/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createInitialDataSelector } from './helpers';
import { Request } from 'react-redux-request';
import { loadErrorGroupList } from '../../services/rest/apm';

const ID = 'errorGroupList';
const INITIAL_DATA = [];
const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function getErrorGroupList(state) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function ErrorGroupDetailsRequest({ urlParams, render }) {
  const {
    serviceName,
    start,
    end,
    sortField,
    sortDirection,
    kuery
  } = urlParams;

  if (!(serviceName && start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadErrorGroupList}
      args={[{ serviceName, start, end, sortField, sortDirection, kuery }]}
      selector={getErrorGroupList}
      render={render}
    />
  );
}
