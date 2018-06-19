/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withInitialData } from './helpers';
import { Request } from 'react-redux-request';
import { loadSpans } from '../../services/rest';

const ID = 'spans';
const INITIAL_DATA = {};

export function getSpans(state) {
  return withInitialData(state.reactReduxRequest[ID], INITIAL_DATA);
}

export function SpansRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionId, kuery } = urlParams;

  if (!(serviceName && start && end && transactionId)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadSpans}
      selector={getSpans}
      args={[{ serviceName, start, end, transactionId, kuery }]}
      render={render}
    />
  );
}
