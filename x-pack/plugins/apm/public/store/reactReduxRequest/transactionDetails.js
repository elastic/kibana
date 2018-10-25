/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createInitialDataSelector } from './helpers';
import { Request } from 'react-redux-request';
import { loadTransaction } from '../../services/rest/apm';

const ID = 'transactionDetails';
const INITIAL_DATA = {};
const withInitialData = createInitialDataSelector(INITIAL_DATA);

export function getTransactionDetails(state) {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function TransactionDetailsRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionId, traceId, kuery } = urlParams;

  if (!(serviceName && start && end && transactionId)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadTransaction}
      selector={getTransactionDetails}
      args={[{ serviceName, start, end, transactionId, traceId, kuery }]}
      render={render}
    />
  );
}
