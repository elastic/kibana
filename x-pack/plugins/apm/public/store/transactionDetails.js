/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withInitialData } from './selectorHelpers';
import { ReduxRequest } from '../components/shared/ReduxRequest';
import { loadTransaction } from '../services/rest';

const ID = 'transactionDetails';
const INITIAL_DATA = {};

export function getTransactionDetails(state) {
  return withInitialData(state.reduxRequest[ID], INITIAL_DATA);
}

export function TransactionDetailsRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionId, kuery } = urlParams;
  return (
    <ReduxRequest
      id={ID}
      shouldInvoke={Boolean(serviceName && start && end && transactionId)}
      fn={loadTransaction}
      selector={getTransactionDetails}
      args={[{ serviceName, start, end, transactionId, kuery }]}
      render={render}
    />
  );
}
