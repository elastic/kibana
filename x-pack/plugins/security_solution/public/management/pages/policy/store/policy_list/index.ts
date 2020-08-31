/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyListState } from '../../types';
import { ImmutableReducer } from '../../../../../common/store';
import { AppAction } from '../../../../../common/store/actions';
import { Immutable } from '../../../../../../common/endpoint/types';
export { policyListReducer } from './reducer';
export { PolicyListAction } from './action';
export { policyListMiddlewareFactory } from './middleware';

export interface EndpointPolicyListStatePluginState {
  policyList: Immutable<PolicyListState>;
}

export interface EndpointPolicyListStatePluginReducer {
  policyList: ImmutableReducer<PolicyListState, AppAction>;
}
