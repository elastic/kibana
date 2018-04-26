/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rest from '../services/rest';
import { createActionTypes, createAction, createReducer } from './apiHelpers';

const actionTypes = createActionTypes('ERROR_GROUP');
export const [
  ERROR_GROUP_LOADING,
  ERROR_GROUP_SUCCESS,
  ERROR_GROUP_FAILURE
] = actionTypes;

const INITIAL_DATA = {};

export default createReducer(actionTypes, INITIAL_DATA);

export const loadErrorGroup = createAction(actionTypes, rest.loadErrorGroup);

export function getErrorGroup(state) {
  return state.errorGroup;
}
