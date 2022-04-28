/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import { PolicyDetailsArtifactsPageLocation, PolicyDetailsState } from '../types';
import { State } from '../../../../common/store';
import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
} from '../../../common/constants';
import {
  getPolicyBlocklistsPath,
  getPolicyDetailsArtifactsListPath,
  getPolicyEventFiltersPath,
  getPolicyHostIsolationExceptionsPath,
} from '../../../common/routing';
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

export function usePolicyDetailsNavigateCallback() {
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const history = useHistory();
  const policyId = usePolicyDetailsSelector(policyIdFromParams);

  return useCallback(
    (args: Partial<PolicyDetailsArtifactsPageLocation>) =>
      history.push(
        getPolicyDetailsArtifactsListPath(policyId, {
          ...location,
          ...args,
        })
      ),
    [history, location, policyId]
  );
}

export function usePolicyDetailsArtifactsNavigateCallback(listId: string) {
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const history = useHistory();
  const policyId = usePolicyDetailsSelector(policyIdFromParams);

  const getPath = useCallback(
    (args: Partial<PolicyDetailsArtifactsPageLocation>) => {
      if (listId === ENDPOINT_TRUSTED_APPS_LIST_ID) {
        return getPolicyDetailsArtifactsListPath(policyId, {
          ...location,
          ...args,
        });
      } else if (listId === ENDPOINT_EVENT_FILTERS_LIST_ID) {
        return getPolicyEventFiltersPath(policyId, {
          ...location,
          ...args,
        });
      } else if (listId === ENDPOINT_BLOCKLISTS_LIST_ID) {
        return getPolicyBlocklistsPath(policyId, {
          ...location,
          ...args,
        });
      } else {
        return getPolicyHostIsolationExceptionsPath(policyId, {
          ...location,
          ...args,
        });
      }
    },
    [listId, location, policyId]
  );

  return useCallback(
    (args: Partial<PolicyDetailsArtifactsPageLocation>) => history.push(getPath(args)),
    [getPath, history]
  );
}
