/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { GlobalState, PolicyListState, PolicyDetailsState } from '../../types';

export function usePolicyListSelector<TSelected>(selector: (state: PolicyListState) => TSelected) {
  return useSelector((state: GlobalState) => selector(state.policyList));
}

export function usePolicyDetailsSelector<TSelected>(
  selector: (state: PolicyDetailsState) => TSelected
) {
  return useSelector((state: GlobalState) => selector(state.policyDetails));
}
