/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { PolicyListState, PolicyDetailsState } from '../types';
import { State } from '../../common/store';

export function usePolicyListSelector<TSelected>(selector: (state: PolicyListState) => TSelected) {
  return useSelector((state: State) => selector(state.policyList as PolicyListState));
}

export function usePolicyDetailsSelector<TSelected>(
  selector: (state: PolicyDetailsState) => TSelected
) {
  return useSelector((state: State) => selector(state.policyDetails as PolicyDetailsState));
}
