/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rest from '../services/rest';
import { createActionTypes, createAction, createReducer } from './apiHelpers';

const actionTypes = createActionTypes('ERROR_GROUP_LIST');
export const [
  ERROR_GROUP_LIST_LOADING,
  ERROR_GROUP_LIST_SUCCESS,
  ERROR_GROUP_LIST_FAILURE
] = actionTypes;

const INITIAL_DATA = [];
export default createReducer(actionTypes, INITIAL_DATA);

export const loadErrorGroupList = createAction(
  actionTypes,
  rest.loadErrorGroupList
);

export const getErrorGroupList = state => {
  return state.errorGroupList;
};
