/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hostListReducer } from './hosts';
import { AppAction } from './action';
import { GlobalState, ImmutableReducer, EndpointAppSubpluginReducers } from '../types';
import { policyListReducer } from './policy_list';
import { policyDetailsReducer } from './policy_details';
import { immutableCombineReducers } from './immutable_combine_reducers';

export const appReducerFactory: (
  subpluginReducers: EndpointAppSubpluginReducers
) => ImmutableReducer<GlobalState, AppAction> = ({ alerting }) =>
  immutableCombineReducers({
    hostList: hostListReducer,
    alerting,
    policyList: policyListReducer,
    policyDetails: policyDetailsReducer,
  });
