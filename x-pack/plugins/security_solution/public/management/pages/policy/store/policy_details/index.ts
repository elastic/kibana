/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyDetailsState } from '../../types';
import { ImmutableReducer } from '../../../../../common/store';
import { AppAction } from '../../../../../common/store/actions';
import { Immutable } from '../../../../../../common/endpoint/types';

export { policyDetailsMiddlewareFactory } from './middleware';
export { PolicyDetailsAction } from './action';
export { policyDetailsReducer } from './reducer';

export interface EndpointPolicyDetailsStatePluginState {
  policyDetails: Immutable<PolicyDetailsState>;
}

export interface EndpointPolicyDetailsStatePluginReducer {
  policyDetails: ImmutableReducer<PolicyDetailsState, AppAction>;
}
