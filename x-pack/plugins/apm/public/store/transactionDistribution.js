/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rest from '../services/rest';
import { createActionTypes, createAction, createReducer } from './apiHelpers';

const actionTypes = createActionTypes('TRANSACTION_DISTRIBUTION');
export const [
  TRANSACTION_DISTRIBUTION_LOADING,
  TRANSACTION_DISTRIBUTION_SUCCESS,
  TRANSACTION_DISTRIBUTION_FAILURE
] = actionTypes;

const INITIAL_DATA = { buckets: [], totalHits: 0 };
const transactionDistribution = createReducer(actionTypes, INITIAL_DATA);

export const loadTransactionDistribution = createAction(
  actionTypes,
  rest.loadTransactionDistribution
);

export function getTransactionDistribution(state) {
  return state.transactionDistribution;
}

export function getDefaultTransactionId(state) {
  const _distribution = getTransactionDistribution(state);
  return _distribution.data.defaultTransactionId;
}

export default transactionDistribution;
