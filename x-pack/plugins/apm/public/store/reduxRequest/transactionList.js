/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import orderBy from 'lodash.orderby';
import { createSelector } from 'reselect';
import { ReduxRequest } from '../../components/shared/ReduxRequest';
import { loadTransactionList } from '../../services/rest';

const ID = 'transactionList';
const INITIAL_DATA = [];

export const getTransactionList = createSelector(
  state => state.reduxRequest[ID],
  state => state.sorting.transaction,
  (transactionList = {}, transactionSorting) => {
    const { key: sortKey, descending } = transactionSorting;

    return {
      ...transactionList,
      data: orderBy(
        transactionList.data || INITIAL_DATA,
        sortKey,
        descending ? 'desc' : 'asc'
      )
    };
  }
);

export function TransactionListRequest({ urlParams, render }) {
  const { serviceName, start, end, transactionType, kuery } = urlParams;
  return (
    <ReduxRequest
      id={ID}
      shouldInvoke={Boolean(serviceName && start && end && transactionType)}
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
