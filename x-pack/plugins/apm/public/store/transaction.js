/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rest from '../services/rest';
import { createActionTypes, createAction, createReducer } from './apiHelpers';

const actionTypes = createActionTypes('TRANSACTION');
export const [
  TRANSACTION_LOADING,
  TRANSACTION_SUCCESS,
  TRANSACTION_FAILURE
] = actionTypes;

const INITIAL_DATA = {};
const transaction = createReducer(actionTypes, INITIAL_DATA);

export const loadTransaction = createAction(actionTypes, rest.loadTransaction);

export function getTransaction(state) {
  return state.transaction;
}

export default transaction;
