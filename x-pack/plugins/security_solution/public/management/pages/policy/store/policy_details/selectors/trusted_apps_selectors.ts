/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchPath } from 'react-router-dom';
import { PolicyDetailsArtifactsPageLocation, PolicyDetailsState } from '../../../types';
import {
  Immutable,
  ImmutableArray,
  PostTrustedAppCreateResponse,
  GetTrustedListAppsResponse,
} from '../../../../../../../common/endpoint/types';
import { MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH } from '../../../../../common/constants';
import {
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
} from '../../../../../state';

/**
 * Returns current artifacts location
 */
export const getCurrentArtifactsLocation = (
  state: Immutable<PolicyDetailsState>
): Immutable<PolicyDetailsArtifactsPageLocation> => state.artifacts.location;

/**
 * Returns current available artifacts list
 */
export const getAvailableArtifactsList = (
  state: Immutable<PolicyDetailsState>
): Immutable<GetTrustedListAppsResponse | undefined> =>
  isLoadedResourceState(state.artifacts.availableList)
    ? state.artifacts.availableList.data
    : undefined;

/**
 * Returns if available list is loading
 */
export const getAvailableArtifactsListIsLoading = (state: Immutable<PolicyDetailsState>): boolean =>
  isLoadingResourceState(state.artifacts.availableList);

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
 * Returns true if there is data available even if the search didn't returned it.
 */
export const getAvailableArtifactsListExist = (state: Immutable<PolicyDetailsState>): boolean => {
  return (
    isLoadedResourceState(state.artifacts.availableListEntriesExist) &&
    state.artifacts.availableListEntriesExist.data
  );
};

/**
 * Returns true if there is data available even if the search didn't returned it.
 */
export const getAvailableArtifactsListExistIsLoading = (
  state: Immutable<PolicyDetailsState>
): boolean => {
  return isLoadingResourceState(state.artifacts.availableListEntriesExist);
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

/** Returns a boolean of whether the user is on the policy details page or not */
export const isOnPolicyTrustedAppsPage = (state: Immutable<PolicyDetailsState>) => {
  return (
    matchPath(state.location?.pathname ?? '', {
      path: MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH,
      exact: true,
    }) !== null
  );
};
