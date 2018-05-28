/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import orderBy from 'lodash.orderby';
import { createSelector } from 'reselect';
import { Request } from 'react-redux-request';
import { loadTransactionList } from '../../services/rest';
import { withInitialData } from './helpers';

const ID = 'transactionList';
const INITIAL_DATA = [];

export const getTransactionList = createSelector(
  state => withInitialData(state.reactReduxRequest[ID], INITIAL_DATA),
  state => state.sorting.transaction,
  (transactionList = {}, transactionSorting) => {
    const { key: sortKey, descending } = transactionSorting;

    return {
      ...transactionList,
      data: orderBy(transactionList.data, sortKey, descending ? 'desc' : 'asc')
    };
  }
);

export function TransactionListRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionType, kuery } = urlParams;

  if (!(serviceName && start && end && transactionType)) {
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
