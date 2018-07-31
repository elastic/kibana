/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createSelector } from 'reselect';
import { Request } from 'react-redux-request';
import { loadTransactionList } from '../../services/rest/apm';
import { createInitialDataSelector } from './helpers';

const ID = 'transactionList';
const INITIAL_DATA = [];
const withInitialData = createInitialDataSelector(INITIAL_DATA);

const getRelativeImpact = (impact, impactMin, impactMax) =>
  Math.max(
    ((impact - impactMin) / Math.max(impactMax - impactMin, 1)) * 100,
    1
  );

function getWithRelativeImpact(items) {
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
  state => withInitialData(state.reactReduxRequest[ID]),
  transactionList => {
    return {
      ...transactionList,
      data: getWithRelativeImpact(transactionList.data)
    };
  }
);

// export function getTransactionList(state) {
//   const transactionList = withInitialData(state.reactReduxRequest[ID]);
//   return {
//     ...transactionList,

//   };
// }

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
