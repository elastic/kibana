/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { TransactionWithErrorCountAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/get_transaction';
import { loadTransaction } from '../../services/rest/apm/transactions';
import { IReduxState } from '../rootReducer';
import { IUrlParams } from '../urlParams';

const ID = 'transactionDetails';
export function getTransactionDetails(state: IReduxState) {
  return state.reactReduxRequest[ID];
}

export function TransactionDetailsRequest({
  urlParams,
  render
}: {
  urlParams: IUrlParams;
  render: RRRRender<TransactionWithErrorCountAPIResponse>;
}) {
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
