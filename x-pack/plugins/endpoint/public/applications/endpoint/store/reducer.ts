/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hostListReducer } from './hosts';
import { AppAction } from './action';
import { alertListReducer } from '../alerts/store';
import { GlobalState, ImmutableReducer } from '../types';
import { policyListReducer } from './policy_list';
import { policyDetailsReducer } from './policy_details';
import { immutableCombineReducers } from './immutable_combine_reducers';

export const appReducer: ImmutableReducer<GlobalState, AppAction> = immutableCombineReducers({
  hostList: hostListReducer,
  alertList: alertListReducer,
  policyList: policyListReducer,
  policyDetails: policyDetailsReducer,
});
