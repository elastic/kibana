/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender, RRRRenderResponse } from 'react-redux-request';
import { createSelector } from 'reselect';
import { ITransactionDistributionAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/distribution';
import { loadTransactionDistribution } from '../../services/rest/apm/transaction_groups';
import { IReduxState } from '../rootReducer';
import { IUrlParams } from '../urlParams';
import { createInitialDataSelector } from './helpers';

const ID = 'transactionDistribution';
const INITIAL_DATA = { buckets: [], totalHits: 0, bucketSize: 0 };
const withInitialData = createInitialDataSelector<
  ITransactionDistributionAPIResponse
>(INITIAL_DATA);

export function getTransactionDistribution(
  state: IReduxState
): RRRRenderResponse<ITransactionDistributionAPIResponse> {
  return withInitialData(state.reactReduxRequest[ID]);
}

export const getDefaultDistributionSample = createSelector(
  getTransactionDistribution,
  distribution => {
    const { defaultSample = {} } = distribution.data;
    return {
      traceId: defaultSample.traceId,
      transactionId: defaultSample.transactionId
    };
  }
);

export function TransactionDistributionRequest({
  urlParams,
  render
}: {
  urlParams: IUrlParams;
  render: RRRRender<ITransactionDistributionAPIResponse>;
}) {
  const {
    serviceName,
    transactionType,
    transactionId,
    traceId,
    start,
    end,
    transactionName,
    kuery
  } = urlParams;

  if (!(serviceName && transactionType && start && end && transactionName)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadTransactionDistribution}
      args={[
        {
          serviceName,
          transactionType,
          transactionId,
          traceId,
          start,
          end,
          transactionName,
          kuery
        }
      ]}
      selector={getTransactionDistribution}
      render={render}
    />
  );
}
