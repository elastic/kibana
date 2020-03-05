/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { combineReducers, Reducer } from 'redux';
import { managementListReducer } from './managing';
import { AppAction } from './action';
import { alertListReducer } from './alerts';
import { GlobalState } from '../types';
import { policyListReducer } from './policy_list';

export const appReducer: Reducer<GlobalState, AppAction> = combineReducers({
  managementList: managementListReducer,
  alertList: alertListReducer,
  policyList: policyListReducer,
});
