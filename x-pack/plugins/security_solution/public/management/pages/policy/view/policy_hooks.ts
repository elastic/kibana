/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import type { PolicyDetailsArtifactsPageLocation, PolicyDetailsState } from '../types';
import type { State } from '../../../../common/store';
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
import { APP_UI_ID, POLICIES_PATH } from '../../../../../common/constants';

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

export const useIsPolicySettingsBarVisible = () => {
  return (
    window.location.pathname.includes(POLICIES_PATH) &&
    window.location.pathname.includes('/settings')
  );
};

/**
 * Indicates if user is granted Write access to Policy Management. This method differs from what
 * `useUserPrivileges().endpointPrivileges.canWritePolicyManagement` in that it also checks if
 * user has `canAccessFleet` if form is being displayed outside of Security Solution.
 * This is to ensure that the Policy Form remains accessible when displayed inside of Fleet
 * pages if the user does not have privileges to security solution policy management.
 */
export const useShowEditableFormFields = (): boolean => {
  const { canWritePolicyManagement, canAccessFleet } = useUserPrivileges().endpointPrivileges;
  const { getUrlForApp } = useKibana().services.application;

  const securitySolutionUrl = useMemo(() => {
    return getUrlForApp(APP_UI_ID);
  }, [getUrlForApp]);

  return useMemo(() => {
    if (window.location.pathname.startsWith(securitySolutionUrl)) {
      return canWritePolicyManagement;
    } else {
      return canAccessFleet;
    }
  }, [canAccessFleet, canWritePolicyManagement, securitySolutionUrl]);
};
