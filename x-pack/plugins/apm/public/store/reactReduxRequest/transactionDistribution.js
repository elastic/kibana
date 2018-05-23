/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withInitialData } from './helpers';
import { Request } from 'react-redux-request';
import { loadTransactionDistribution } from '../../services/rest';

const INITIAL_DATA = { buckets: [], totalHits: 0 };

export function getTransactionDistribution(state) {
  return withInitialData(
    state.reactReduxRequest.transactionDistribution,
    INITIAL_DATA
  );
}

export function getDefaultTransactionId(state) {
  const _distribution = getTransactionDistribution(state);
  return _distribution.data.defaultTransactionId;
}

export function TransactionDistributionRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionName, kuery } = urlParams;

  if (!(serviceName && start && end && transactionName)) {
    return null;
  }

  return (
    <Request
      id="transactionDistribution"
      fn={loadTransactionDistribution}
      args={[{ serviceName, start, end, transactionName, kuery }]}
      selector={getTransactionDistribution}
      render={render}
    />
  );
}
