/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableReducer } from '../../../../../../common/store';
import { PolicyDetailsState } from '../../../types';
import { AppAction } from '../../../../../../common/store/actions';
import { policySettingsReducer } from './policy_settings_reducer';
import { initialPolicyDetailsState } from './initial_policy_details_state';

export * from './initial_policy_details_state';

export const policyDetailsReducer: ImmutableReducer<PolicyDetailsState, AppAction> = (
  state = initialPolicyDetailsState(),
  action
) => {
  return [policySettingsReducer].reduce(
    (updatedState, runReducer) => runReducer(updatedState, action),
    state
  );
};
