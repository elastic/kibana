/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Request, RRRRender } from 'react-redux-request';
import { createSelector } from 'reselect';
import { TransactionListAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/get_top_transactions';
import { loadTransactionList } from '../../services/rest/apm/transaction_groups';
import { IReduxState } from '../rootReducer';
import { IUrlParams } from '../urlParams';
import { createInitialDataSelector } from './helpers';

const ID = 'transactionList';
const INITIAL_DATA: TransactionListAPIResponse = [];
const withInitialData = createInitialDataSelector<TransactionListAPIResponse>(
  INITIAL_DATA
);

const getRelativeImpact = (
  impact: number,
  impactMin: number,
  impactMax: number
) =>
  Math.max(
    ((impact - impactMin) / Math.max(impactMax - impactMin, 1)) * 100,
    1
  );

function getWithRelativeImpact(items: TransactionListAPIResponse) {
  const impacts = items.map(({ impact }) => impact);
  const impactMin = Math.min(...impacts);
  const impactMax = Math.max(...impacts);

  return items.map(item => {
    return {
      ...item,
      impactRelative: getRelativeImpact(item.impact, impactMin, impactMax)
    };
  });
}

export const getTransactionList = createSelector(
  (state: IReduxState) => withInitialData(state.reactReduxRequest[ID]),
  transactionList => {
    return {
      ...transactionList,
      data: getWithRelativeImpact(transactionList.data)
    };
  }
);

export function TransactionListRequest({
  urlParams,
  render
}: {
  urlParams: IUrlParams;
  render: RRRRender<TransactionListAPIResponse>;
}) {
  const { serviceName, start, end, transactionType, kuery } = urlParams;

  if (!(serviceName && start && end)) {
    return null;
  }

  return (
    <Request
      id={ID}
      fn={loadTransactionList}
      args={[
        {
          serviceName,
          start,
          end,
          transactionType,
          kuery
        }
      ]}
      selector={getTransactionList}
      render={render}
    />
  );
}
