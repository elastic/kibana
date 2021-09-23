/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyDetailsState } from '../../../types';
import { initialPolicyDetailsState } from '../reducer/initial_policy_details_state';
import {
  getCurrentArtifactsLocation,
  getAvailableArtifactsList,
  getAvailableArtifactsListIsLoading,
  getUpdateArtifactsIsLoading,
  getUpdateArtifactsIsFailed,
  getUpdateArtifactsLoaded,
  getAvailableArtifactsListExist,
  getAvailableArtifactsListExistIsLoading,
  getUpdateArtifacts,
  isOnPolicyTrustedAppsPage,
} from './trusted_apps_selectors';

import { ImmutableObject } from '../../../../../../../common/endpoint/types';
import {
  createLoadedResourceState,
  createUninitialisedResourceState,
  createLoadingResourceState,
  createFailedResourceState,
} from '../../../../../state';
import { MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH } from '../../../../../common/constants';
import { getListResponse, getAPIError, getFakeCreateResponse } from '../../../test_utils';

describe('policy trusted apps selectors', () => {
  let initialState: ImmutableObject<PolicyDetailsState>;

  beforeEach(() => {
    initialState = initialPolicyDetailsState();
  });

  describe('isOnPolicyTrustedAppsPage()', () => {
    it('when location is on policy trusted apps page', () => {
      const isOnPage = isOnPolicyTrustedAppsPage({
        ...initialState,
        location: {
          pathname: MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH,
          search: '',
          hash: '',
        },
      });
      expect(isOnPage).toBeFalsy();
    });
    it('when location is not on policy trusted apps page', () => {
      const isOnPage = isOnPolicyTrustedAppsPage({
        ...initialState,
        location: { pathname: '', search: '', hash: '' },
      });
      expect(isOnPage).toBeFalsy();
    });
  });

  describe('getCurrentArtifactsLocation()', () => {
    it('when location is defined', () => {
      const location = getCurrentArtifactsLocation(initialState);
      expect(location).toEqual({ filter: '', page_index: 0, page_size: 10, show: undefined });
    });
    it('when location has show param to list', () => {
      const location = getCurrentArtifactsLocation({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          location: { ...initialState.artifacts.location, show: 'list' },
        },
      });
      expect(location).toEqual({ filter: '', page_index: 0, page_size: 10, show: 'list' });
    });
  });

  describe('getAvailableArtifactsList()', () => {
    it('when available list is uninitialised', () => {
      const availableList = getAvailableArtifactsList(initialState);
      expect(availableList).toBeUndefined();
    });
    it('when available list is loading', () => {
      const availableList = getAvailableArtifactsList({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableList: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(availableList).toBeUndefined();
    });
    it('when available list is loaded', () => {
      const availableList = getAvailableArtifactsList({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableList: createLoadedResourceState(getListResponse()),
        },
      });
      expect(availableList).toEqual(getListResponse());
    });
  });

  describe('getAvailableArtifactsListIsLoading()', () => {
    it('when available list is loading', () => {
      const isLoading = getAvailableArtifactsListIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableList: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(isLoading).toBeTruthy();
    });
    it('when available list is uninitialised', () => {
      const isLoading = getAvailableArtifactsListIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableList: createUninitialisedResourceState(),
        },
      });
      expect(isLoading).toBeFalsy();
    });
    it('when available list is loaded', () => {
      const isLoading = getAvailableArtifactsListIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableList: createLoadedResourceState(getListResponse()),
        },
      });
      expect(isLoading).toBeFalsy();
    });
  });

  describe('getUpdateArtifactsIsLoading()', () => {
    it('when update artifacts is loading', () => {
      const isLoading = getUpdateArtifactsIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(isLoading).toBeTruthy();
    });
    it('when update artifacts is uninitialised', () => {
      const isLoading = getUpdateArtifactsIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createUninitialisedResourceState(),
        },
      });
      expect(isLoading).toBeFalsy();
    });
    it('when update artifacts is loaded', () => {
      const isLoading = getUpdateArtifactsIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createLoadedResourceState([getFakeCreateResponse()]),
        },
      });
      expect(isLoading).toBeFalsy();
    });
  });

  describe('getUpdateArtifactsIsFailed()', () => {
    it('when update artifacts is loading', () => {
      const hasFailed = getUpdateArtifactsIsFailed({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(hasFailed).toBeFalsy();
    });
    it('when update artifacts is uninitialised', () => {
      const hasFailed = getUpdateArtifactsIsFailed({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createUninitialisedResourceState(),
        },
      });
      expect(hasFailed).toBeFalsy();
    });
    it('when update artifacts is loaded', () => {
      const hasFailed = getUpdateArtifactsIsFailed({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createLoadedResourceState([getFakeCreateResponse()]),
        },
      });
      expect(hasFailed).toBeFalsy();
    });
    it('when update artifacts has failed', () => {
      const hasFailed = getUpdateArtifactsIsFailed({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createFailedResourceState(getAPIError()),
        },
      });
      expect(hasFailed).toBeTruthy();
    });
  });

  describe('getUpdateArtifactsLoaded()', () => {
    it('when update artifacts is loading', () => {
      const isLoaded = getUpdateArtifactsLoaded({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(isLoaded).toBeFalsy();
    });
    it('when update artifacts is uninitialised', () => {
      const isLoaded = getUpdateArtifactsLoaded({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createUninitialisedResourceState(),
        },
      });
      expect(isLoaded).toBeFalsy();
    });
    it('when update artifacts is loaded', () => {
      const isLoaded = getUpdateArtifactsLoaded({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createLoadedResourceState([getFakeCreateResponse()]),
        },
      });
      expect(isLoaded).toBeTruthy();
    });
    it('when update artifacts has failed', () => {
      const isLoaded = getUpdateArtifactsLoaded({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createFailedResourceState(getAPIError()),
        },
      });
      expect(isLoaded).toBeFalsy();
    });
  });

  describe('getUpdateArtifacts()', () => {
    it('when update artifacts is loading', () => {
      const isLoading = getUpdateArtifacts({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(isLoading).toBeUndefined();
    });
    it('when update artifacts is uninitialised', () => {
      const isLoading = getUpdateArtifacts({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createUninitialisedResourceState(),
        },
      });
      expect(isLoading).toBeUndefined();
    });
    it('when update artifacts is loaded', () => {
      const isLoading = getUpdateArtifacts({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createLoadedResourceState([getFakeCreateResponse()]),
        },
      });
      expect(isLoading).toEqual([getFakeCreateResponse()]);
    });
    it('when update artifacts has failed', () => {
      const isLoading = getUpdateArtifacts({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: createFailedResourceState(getAPIError()),
        },
      });
      expect(isLoading).toBeUndefined();
    });
  });

  describe('getAvailableArtifactsListExist()', () => {
    it('when check artifacts exists is loading', () => {
      const exists = getAvailableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(exists).toBeFalsy();
    });
    it('when check artifacts exists is uninitialised', () => {
      const exists = getAvailableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createUninitialisedResourceState(),
        },
      });
      expect(exists).toBeFalsy();
    });
    it('when check artifacts exists is loaded with negative result', () => {
      const exists = getAvailableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createLoadedResourceState(false),
        },
      });
      expect(exists).toBeFalsy();
    });
    it('when check artifacts exists is loaded with positive result', () => {
      const exists = getAvailableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createLoadedResourceState(true),
        },
      });
      expect(exists).toBeTruthy();
    });
    it('when check artifacts exists has failed', () => {
      const exists = getAvailableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createFailedResourceState(getAPIError()),
        },
      });
      expect(exists).toBeFalsy();
    });
  });

  describe('getAvailableArtifactsListExistIsLoading()', () => {
    it('when check artifacts exists is loading', () => {
      const isLoading = getAvailableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(isLoading).toBeTruthy();
    });
    it('when check artifacts exists is uninitialised', () => {
      const isLoading = getAvailableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createUninitialisedResourceState(),
        },
      });
      expect(isLoading).toBeFalsy();
    });
    it('when check artifacts exists is loaded with negative result', () => {
      const isLoading = getAvailableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createLoadedResourceState(false),
        },
      });
      expect(isLoading).toBeFalsy();
    });
    it('when check artifacts exists is loaded with positive result', () => {
      const isLoading = getAvailableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createLoadedResourceState(true),
        },
      });
      expect(isLoading).toBeFalsy();
    });
    it('when check artifacts exists has failed', () => {
      const isLoading = getAvailableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: createFailedResourceState(getAPIError()),
        },
      });
      expect(isLoading).toBeFalsy();
    });
  });
});
