/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { fetchAgentPolicies } from './api';
import { getAgentPoliciesAction } from './actions';
import { fetchEffectFactory } from '../../../apps/synthetics/state/utils/fetch_effect';

export function* fetchAgentPoliciesEffect() {
  yield takeLeading(
    getAgentPoliciesAction.get,
    fetchEffectFactory(
      fetchAgentPolicies,
      getAgentPoliciesAction.success,
      getAgentPoliciesAction.fail
    )
  );
}
