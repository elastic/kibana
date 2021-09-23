/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PolicyDetailsState } from '../../../types';
import { initialPolicyDetailsState } from '../reducer/initial_policy_details_state';
import { policyTrustedAppsReducer } from './trusted_apps_reducer';

import { ImmutableObject } from '../../../../../../../common/endpoint/types';
import {
  createLoadedResourceState,
  createUninitialisedResourceState,
  createLoadingResourceState,
  createFailedResourceState,
} from '../../../../../state';
import { getListResponse, getAPIError, getFakeCreateResponse } from '../../../test_utils';

describe('policy trusted apps reducer', () => {
  let initialState: ImmutableObject<PolicyDetailsState>;

  beforeEach(() => {
    initialState = initialPolicyDetailsState();
  });

  describe('PolicyTrustedApps', () => {
    describe('policyArtifactsAvailableListPageDataChanged', () => {
      it('sets available list uninitialised', () => {
        const result = policyTrustedAppsReducer(initialState, {
          type: 'policyArtifactsAvailableListPageDataChanged',
          payload: createUninitialisedResourceState(),
        });

        expect(result).toStrictEqual({
          ...initialState,
          artifacts: {
            ...initialState.artifacts,
            availableList: {
              type: 'UninitialisedResourceState',
            },
          },
        });
      });
      it('sets available list loading', () => {
        const result = policyTrustedAppsReducer(initialState, {
          type: 'policyArtifactsAvailableListPageDataChanged',
          payload: createLoadingResourceState(createUninitialisedResourceState()),
        });

        expect(result).toStrictEqual({
          ...initialState,
          artifacts: {
            ...initialState.artifacts,
            availableList: {
              previousState: {
                type: 'UninitialisedResourceState',
              },
              type: 'LoadingResourceState',
            },
          },
        });
      });
      it('sets available list loaded', () => {
        const result = policyTrustedAppsReducer(initialState, {
          type: 'policyArtifactsAvailableListPageDataChanged',
          payload: createLoadedResourceState(getListResponse()),
        });

        expect(result).toStrictEqual({
          ...initialState,
          artifacts: {
            ...initialState.artifacts,
            availableList: {
              data: getListResponse(),
              type: 'LoadedResourceState',
            },
          },
        });
      });
      it('sets available list failed', () => {
        const result = policyTrustedAppsReducer(initialState, {
          type: 'policyArtifactsAvailableListPageDataChanged',
          payload: createFailedResourceState(getAPIError()),
        });

        expect(result).toStrictEqual({
          ...initialState,
          artifacts: {
            ...initialState.artifacts,
            availableList: {
              type: 'FailedResourceState',
              error: getAPIError(),
              lastLoadedState: undefined,
            },
          },
        });
      });
    });
  });

  describe('policyArtifactsUpdateTrustedAppsChanged', () => {
    it('sets update trusted app uninitialised', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsUpdateTrustedAppsChanged',
        payload: createUninitialisedResourceState(),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: {
            type: 'UninitialisedResourceState',
          },
        },
      });
    });
    it('sets update trusted app loading', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsUpdateTrustedAppsChanged',
        payload: createLoadingResourceState(createUninitialisedResourceState()),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: {
            previousState: {
              type: 'UninitialisedResourceState',
            },
            type: 'LoadingResourceState',
          },
        },
      });
    });
    it('sets update trusted app loaded', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsUpdateTrustedAppsChanged',
        payload: createLoadedResourceState([getFakeCreateResponse()]),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: {
            data: [getFakeCreateResponse()],
            type: 'LoadedResourceState',
          },
        },
      });
    });
    it('sets update trusted app failed', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsUpdateTrustedAppsChanged',
        payload: createFailedResourceState(getAPIError()),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: {
            type: 'FailedResourceState',
            error: getAPIError(),
            lastLoadedState: undefined,
          },
        },
      });
    });
  });

  describe('policyArtifactsAvailableListExistDataChanged', () => {
    it('sets exists trusted app uninitialised', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAvailableListExistDataChanged',
        payload: createUninitialisedResourceState(),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: {
            type: 'UninitialisedResourceState',
          },
        },
      });
    });
    it('sets exists trusted app loading', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAvailableListExistDataChanged',
        payload: createLoadingResourceState(createUninitialisedResourceState()),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: {
            previousState: {
              type: 'UninitialisedResourceState',
            },
            type: 'LoadingResourceState',
          },
        },
      });
    });
    it('sets exists trusted app loaded nefative', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAvailableListExistDataChanged',
        payload: createLoadedResourceState(false),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: {
            data: false,
            type: 'LoadedResourceState',
          },
        },
      });
    });
    it('sets exists trusted app loaded positive', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAvailableListExistDataChanged',
        payload: createLoadedResourceState(true),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: {
            data: true,
            type: 'LoadedResourceState',
          },
        },
      });
    });
    it('sets exists trusted app failed', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAvailableListExistDataChanged',
        payload: createFailedResourceState(getAPIError()),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          availableListEntriesExist: {
            type: 'FailedResourceState',
            error: getAPIError(),
            lastLoadedState: undefined,
          },
        },
      });
    });
  });
});
