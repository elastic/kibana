/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import * as rest from '../services/rest';
import { createActionTypes, createAction, createReducer } from './apiHelpers';

const actionTypes = createActionTypes('SERVICE');
export const [SERVICE_LOADING, SERVICE_SUCCESS, SERVICE_FAILURE] = actionTypes;

const INITIAL_DATA = { types: [] };
const service = createReducer(actionTypes, INITIAL_DATA);
export const loadService = createAction(actionTypes, rest.loadService);

export function getService(state) {
  return state.service;
}

export function getDefaultTransactionType(state) {
  const types = _.get(state.service, 'data.types');
  return _.first(types);
}

export default service;
