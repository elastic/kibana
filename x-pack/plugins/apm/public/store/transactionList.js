/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import orderBy from 'lodash.orderby';
import { createSelector } from 'reselect';
import * as rest from '../services/rest';
import { createActionTypes, createAction, createReducer } from './apiHelpers';

const actionTypes = createActionTypes('TRANSACTIONS_LIST');
export const [
  TRANSACTIONS_LIST_LOADING,
  TRANSACTIONS_LIST_SUCCESS,
  TRANSACTIONS_LIST_FAILURE
] = actionTypes;

const INITIAL_DATA = [];
const transactionList = createReducer(actionTypes, INITIAL_DATA);

export const loadTransactionList = createAction(
  actionTypes,
  rest.loadTransactionList
);

export const getTransactionList = createSelector(
  state => state.transactionList,
  state => state.sorting.transaction,
  (transactionList, transactionSorting) => {
    const { key: sortKey, descending } = transactionSorting;

    return {
      ...transactionList,
      data: orderBy(transactionList.data, sortKey, descending ? 'desc' : 'asc')
    };
  }
);

export default transactionList;
