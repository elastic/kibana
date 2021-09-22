/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { Pagination } from '@elastic/eui';
import {
  PolicyArtifactsState,
  PolicyAssignedTrustedApps,
  PolicyDetailsArtifactsPageLocation,
  PolicyDetailsSelector,
  PolicyDetailsState,
} from '../../../types';
import { GetTrustedAppsListResponse } from '../../../../../../../common/endpoint/types';
import { getCurrentArtifactsLocation } from './policy_common_selectors';
import {
  getLastLoadedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
  LoadedResourceState,
} from '../../../../../state';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../../../common/constants';

export const doesPolicyHaveTrustedApps = (
  state: PolicyDetailsState
): { loading: boolean; hasTrustedApps: boolean } => {
  // TODO: implement empty state (task #1645)
  return {
    loading: false,
    hasTrustedApps: true,
  };
};

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

export const doesPolicyTrustedAppsListNeedUpdate: PolicyDetailsSelector<boolean> = createSelector(
  getCurrentPolicyAssignedTrustedAppsState,
  getCurrentArtifactsLocation,
  (assignedListState, locationData) => {
    return (
      !isLoadedResourceState(assignedListState) ||
      (isLoadedResourceState(assignedListState) &&
        (Object.keys(locationData) as Array<keyof PolicyDetailsArtifactsPageLocation>).some(
          (key) => assignedListState.data.location[key] !== locationData[key]
        ))
    );
  }
);

export const isPolicyTrustedAppListLoading: PolicyDetailsSelector<boolean> = createSelector(
  getCurrentPolicyAssignedTrustedAppsState,
  (assignedState) => isLoadingResourceState(assignedState)
);

export const getPolicyTrustedAppList: PolicyDetailsSelector<GetTrustedAppsListResponse['data']> =
  createSelector(
    getLatestLoadedPolicyAssignedTrustedAppsState,
    getCurrentArtifactsLocation,
    (assignedState, currentUrlLocation) => {
      return assignedState?.data.artifacts.data ?? [];
    }
  );

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
