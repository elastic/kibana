/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRenderArgs } from 'react-redux-request';
import { IDistributionResponse } from '../../../server/lib/transactions/distribution/get_distribution';
import { loadTransactionDistribution } from '../../services/rest/apm';
import { IReduxState } from '../rootReducer';
import { IUrlParams } from '../urlParams';
// @ts-ignore
import { createInitialDataSelector } from './helpers';

const ID = 'transactionDistribution';
const INITIAL_DATA = { buckets: [], totalHits: 0 };
const withInitialData = createInitialDataSelector(INITIAL_DATA);

interface RrrResponse<T> {
  data: T;
}

export function getTransactionDistribution(
  state: IReduxState
): RrrResponse<IDistributionResponse> {
  return withInitialData(state.reactReduxRequest[ID]);
}

export function getDefaultDistributionSample(state: IReduxState) {
  const distribution = getTransactionDistribution(state);
  const { defaultSample = {} } = distribution.data;
  return {
    traceId: defaultSample.traceId,
    transactionId: defaultSample.transactionId
  };
}

export function TransactionDistributionRequest({
  urlParams,
  render
}: {
  urlParams: IUrlParams;
  render: (args: RRRRenderArgs<any>) => any;
}) {
  const { serviceName, start, end, transactionName, kuery } = urlParams;

  if (!(serviceName && start && end && transactionName)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadTransactionDistribution}
      args={[{ serviceName, start, end, transactionName, kuery }]}
      selector={getTransactionDistribution}
      render={render}
    />
  );
}
