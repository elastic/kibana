/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { Pagination } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import {
  PolicyArtifactsState,
  PolicyAssignedTrustedApps,
  PolicyDetailsArtifactsPageListLocationParams,
  PolicyDetailsSelector,
  PolicyDetailsState,
} from '../../../types';
import {
  Immutable,
  ImmutableArray,
  PostTrustedAppCreateResponse,
  GetTrustedAppsListResponse,
  PolicyData,
} from '../../../../../../../common/endpoint/types';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../../../common/constants';
import {
  getLastLoadedResourceState,
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
  LoadedResourceState,
} from '../../../../../state';
import { getCurrentArtifactsLocation } from './policy_common_selectors';

export const doesPolicyHaveTrustedApps = (
  state: PolicyDetailsState
): { loading: boolean; hasTrustedApps: boolean } => {
  return {
    loading: isLoadingResourceState(state.artifacts.assignedList),
    hasTrustedApps: isLoadedResourceState(state.artifacts.assignedList)
      ? !isEmpty(state.artifacts.assignedList.data.artifacts.data)
      : false,
  };
};

/**
 * Returns current assignable artifacts list
 */
export const getAssignableArtifactsList = (
  state: Immutable<PolicyDetailsState>
): Immutable<GetTrustedAppsListResponse> | undefined =>
  getLastLoadedResourceState(state.artifacts.assignableList)?.data;

/**
 * Returns if assignable list is loading
 */
export const getAssignableArtifactsListIsLoading = (
  state: Immutable<PolicyDetailsState>
): boolean => isLoadingResourceState(state.artifacts.assignableList);

/**
 * Returns if update action is loading
 */
export const getUpdateArtifactsIsLoading = (state: Immutable<PolicyDetailsState>): boolean =>
  isLoadingResourceState(state.artifacts.trustedAppsToUpdate);

/**
 * Returns if update action is loading
 */
export const getUpdateArtifactsIsFailed = (state: Immutable<PolicyDetailsState>): boolean =>
  isFailedResourceState(state.artifacts.trustedAppsToUpdate);

/**
 * Returns if update action is done successfully
 */
export const getUpdateArtifactsLoaded = (state: Immutable<PolicyDetailsState>): boolean => {
  return isLoadedResourceState(state.artifacts.trustedAppsToUpdate);
};

/**
 * Returns true if there is data assignable even if the search didn't returned it.
 */
export const getAssignableArtifactsListExist = (state: Immutable<PolicyDetailsState>): boolean => {
  return (
    isLoadedResourceState(state.artifacts.assignableListEntriesExist) &&
    state.artifacts.assignableListEntriesExist.data
  );
};

/**
 * Returns true if there is data assignable even if the search didn't returned it.
 */
export const getAssignableArtifactsListExistIsLoading = (
  state: Immutable<PolicyDetailsState>
): boolean => {
  return isLoadingResourceState(state.artifacts.assignableListEntriesExist);
};

/**
 * Returns artifacts to be updated
 */
export const getUpdateArtifacts = (
  state: Immutable<PolicyDetailsState>
): ImmutableArray<PostTrustedAppCreateResponse> | undefined => {
  return state.artifacts.trustedAppsToUpdate.type === 'LoadedResourceState'
    ? state.artifacts.trustedAppsToUpdate.data
    : undefined;
};

/**
 * Returns does any TA exists
 */
export const getDoesTrustedAppExists = (state: Immutable<PolicyDetailsState>): boolean => {
  return (
    isLoadedResourceState(state.artifacts.doesAnyTrustedAppExists) &&
    state.artifacts.doesAnyTrustedAppExists.data
  );
};

/**
 * Returns does any TA exists loading
 */
export const doesTrustedAppExistsLoading = (state: Immutable<PolicyDetailsState>): boolean => {
  return isLoadingResourceState(state.artifacts.doesAnyTrustedAppExists);
};

/** Returns a boolean of whether the user is on the policy details page or not */
export const getCurrentPolicyAssignedTrustedAppsState: PolicyDetailsSelector<
  PolicyArtifactsState['assignedList']
> = (state) => {
  return state.artifacts.assignedList;
};

export const getLatestLoadedPolicyAssignedTrustedAppsState: PolicyDetailsSelector<
  undefined | LoadedResourceState<PolicyAssignedTrustedApps>
> = createSelector(getCurrentPolicyAssignedTrustedAppsState, (currentAssignedTrustedAppsState) => {
  return getLastLoadedResourceState(currentAssignedTrustedAppsState);
});

export const getCurrentUrlLocationPaginationParams: PolicyDetailsSelector<PolicyDetailsArtifactsPageListLocationParams> =
  // eslint-disable-next-line @typescript-eslint/naming-convention
  createSelector(getCurrentArtifactsLocation, ({ filter, page_index, page_size }) => {
    return { filter, page_index, page_size };
  });

export const doesPolicyTrustedAppsListNeedUpdate: PolicyDetailsSelector<boolean> = createSelector(
  getCurrentPolicyAssignedTrustedAppsState,
  getCurrentUrlLocationPaginationParams,
  (assignedListState, locationData) => {
    return (
      !isLoadedResourceState(assignedListState) ||
      (isLoadedResourceState(assignedListState) &&
        (
          Object.keys(locationData) as Array<keyof PolicyDetailsArtifactsPageListLocationParams>
        ).some((key) => assignedListState.data.location[key] !== locationData[key]))
    );
  }
);

export const isPolicyTrustedAppListLoading: PolicyDetailsSelector<boolean> = createSelector(
  getCurrentPolicyAssignedTrustedAppsState,
  (assignedState) => isLoadingResourceState(assignedState)
);

export const getPolicyTrustedAppList: PolicyDetailsSelector<GetTrustedAppsListResponse['data']> =
  createSelector(getLatestLoadedPolicyAssignedTrustedAppsState, (assignedState) => {
    return assignedState?.data.artifacts.data ?? [];
  });

export const getPolicyTrustedAppsListPagination: PolicyDetailsSelector<Pagination> = createSelector(
  getLatestLoadedPolicyAssignedTrustedAppsState,
  (currentAssignedTrustedAppsState) => {
    const trustedAppsApiResponse = currentAssignedTrustedAppsState?.data.artifacts;

    return {
      // Trusted apps api is `1` based for page - need to subtract here for `Pagination` component
      pageIndex: trustedAppsApiResponse?.page ? trustedAppsApiResponse.page - 1 : 0,
      pageSize: trustedAppsApiResponse?.per_page ?? MANAGEMENT_PAGE_SIZE_OPTIONS[0],
      totalItemCount: trustedAppsApiResponse?.total || 0,
      pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
    };
  }
);

export const getTrustedAppsPolicyListState: PolicyDetailsSelector<
  PolicyDetailsState['artifacts']['policies']
> = (state) => state.artifacts.policies;

export const getTrustedAppsListOfAllPolicies: PolicyDetailsSelector<PolicyData[]> = createSelector(
  getTrustedAppsPolicyListState,
  (policyListState) => {
    return getLastLoadedResourceState(policyListState)?.data.items ?? [];
  }
);

export const getTrustedAppsAllPoliciesById: PolicyDetailsSelector<
  Record<string, Immutable<PolicyData>>
> = createSelector(getTrustedAppsListOfAllPolicies, (allPolicies) => {
  return allPolicies.reduce<Record<string, Immutable<PolicyData>>>((mapById, policy) => {
    mapById[policy.id] = policy;
    return mapById;
  }, {}) as Immutable<Record<string, Immutable<PolicyData>>>;
});

export const getDoesAnyTrustedAppExists: PolicyDetailsSelector<
  PolicyDetailsState['artifacts']['doesAnyTrustedAppExists']
> = (state) => state.artifacts.doesAnyTrustedAppExists;

export const getDoesAnyTrustedAppExistsIsLoading: PolicyDetailsSelector<boolean> = createSelector(
  getDoesAnyTrustedAppExists,
  (doesAnyTrustedAppExists) => {
    return isLoadingResourceState(doesAnyTrustedAppExists);
  }
);
