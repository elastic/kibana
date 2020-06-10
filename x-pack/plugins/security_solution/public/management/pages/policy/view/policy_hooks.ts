/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { PolicyListState, PolicyDetailsState } from '../types';
import { State } from '../../../../common/store';
import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_LIST_NAMESPACE,
} from '../../../common/constants';

/**
 * Narrows global state down to the PolicyListState before calling the provided Policy List Selector
 * @param selector
 */
export function usePolicyListSelector<TSelected>(selector: (state: PolicyListState) => TSelected) {
  return useSelector((state: State) => {
    return selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][
        MANAGEMENT_STORE_POLICY_LIST_NAMESPACE
      ] as PolicyListState
    );
  });
}

/**
 * Narrows global state down to the PolicyDetailsState before calling the provided Policy Details Selector
 * @param selector
 */
export function usePolicyDetailsSelector<TSelected>(
  selector: (state: PolicyDetailsState) => TSelected
) {
  return useSelector((state: State) =>
    selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][
        MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE
      ] as PolicyDetailsState
    )
  );
}
