/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import {
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
} from '../../../../../state';

export const doesPolicyHaveTrustedApps = (
  state: PolicyDetailsState
): { loading: boolean; hasTrustedApps: boolean } => {
  // TODO: implement empty state (task #1645)
  return {
    loading: false,
    hasTrustedApps: true,
  };
};

export const getPolicyAssignedTrustedAppsState: PolicyDetailsSelector<
  PolicyDetailsState['artifacts']['assignedList']
> = (state) => {
  return state.artifacts.assignedList;
};

export const doesPolicyTrustedAppsListNeedUpdate: PolicyDetailsSelector<boolean> = createSelector(
  getPolicyAssignedTrustedAppsState,
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
  getPolicyAssignedTrustedAppsState,
  (assignedState) => isLoadingResourceState(assignedState)
);

export const getPolicyTrustedAppList: PolicyDetailsSelector<GetTrustedAppsListResponse> =
  createSelector(
    getPolicyAssignedTrustedAppsState,
    getCurrentArtifactsLocation,
    (assignedState, currentUrlLocation) => {
      return (
        getLastLoadedResourceState(assignedState)?.data.artifacts ?? {
          data: [],
          page: currentUrlLocation.page_index,
          total: 0,
          per_page: currentUrlLocation.page_size,
        }
      );
    }
  );
