/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PolicyDetailsArtifactsPageLocation, PolicyDetailsState } from '../types';
import { State } from '../../../../common/store';
import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
} from '../../../common/constants';
import { getPolicyDetailsArtifactsListPath } from '../../../common/routing';
import { getCurrentArtifactsLocation, policyIdFromParams } from '../store/policy_details/selectors';

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

export type NavigationCallback = (
  ...args: Parameters<Parameters<typeof useCallback>[0]>
) => Partial<PolicyDetailsArtifactsPageLocation>;

export function usePolicyDetailsNavigateCallback(callback: NavigationCallback) {
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const history = useHistory();
  const policyId = usePolicyDetailsSelector(policyIdFromParams);

  return useCallback(
    (...args) => {
      history.push(
        getPolicyDetailsArtifactsListPath(policyId, {
          ...location,
          ...callback(...args),
        })
      );
    },
    // TODO: needs more investigation, but if callback is in dependencies list memoization will never happen
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, location]
  );
}
