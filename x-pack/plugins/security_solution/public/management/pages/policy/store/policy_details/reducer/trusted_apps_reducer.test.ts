/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PolicyDetailsState } from '../../../types';
import { initialPolicyDetailsState } from './initial_policy_details_state';
import { policyTrustedAppsReducer } from './trusted_apps_reducer';

import { ImmutableObject } from '../../../../../../../common/endpoint/types';
import {
  createLoadedResourceState,
  createUninitialisedResourceState,
  createLoadingResourceState,
  createFailedResourceState,
} from '../../../../../state';
import { getMockListResponse, getAPIError, getMockCreateResponse } from '../../../test_utils';
import { getPolicyDetailsArtifactsListPath } from '../../../../../common/routing';

describe('policy trusted apps reducer', () => {
  let initialState: ImmutableObject<PolicyDetailsState>;

  beforeEach(() => {
    initialState = {
      ...initialPolicyDetailsState(),
      location: {
        pathname: getPolicyDetailsArtifactsListPath('abc'),
        search: '',
        hash: '',
      },
    };
  });

  describe('PolicyTrustedApps', () => {
    describe('policyArtifactsAssignableListPageDataChanged', () => {
      it('sets assignable list uninitialised', () => {
        const result = policyTrustedAppsReducer(initialState, {
          type: 'policyArtifactsAssignableListPageDataChanged',
          payload: createUninitialisedResourceState(),
        });

        expect(result).toStrictEqual({
          ...initialState,
          artifacts: {
            ...initialState.artifacts,
            assignableList: {
              type: 'UninitialisedResourceState',
            },
          },
        });
      });
      it('sets assignable list loading', () => {
        const result = policyTrustedAppsReducer(initialState, {
          type: 'policyArtifactsAssignableListPageDataChanged',
          payload: createLoadingResourceState(createUninitialisedResourceState()),
        });

        expect(result).toStrictEqual({
          ...initialState,
          artifacts: {
            ...initialState.artifacts,
            assignableList: {
              previousState: {
                type: 'UninitialisedResourceState',
              },
              type: 'LoadingResourceState',
            },
          },
        });
      });
      it('sets assignable list loaded', () => {
        const result = policyTrustedAppsReducer(initialState, {
          type: 'policyArtifactsAssignableListPageDataChanged',
          payload: createLoadedResourceState(getMockListResponse()),
        });

        expect(result).toStrictEqual({
          ...initialState,
          artifacts: {
            ...initialState.artifacts,
            assignableList: {
              data: getMockListResponse(),
              type: 'LoadedResourceState',
            },
          },
        });
      });
      it('sets assignable list failed', () => {
        const result = policyTrustedAppsReducer(initialState, {
          type: 'policyArtifactsAssignableListPageDataChanged',
          payload: createFailedResourceState(getAPIError()),
        });

        expect(result).toStrictEqual({
          ...initialState,
          artifacts: {
            ...initialState.artifacts,
            assignableList: {
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
        payload: createLoadedResourceState([getMockCreateResponse()]),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          trustedAppsToUpdate: {
            data: [getMockCreateResponse()],
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

  describe('policyArtifactsAssignableListExistDataChanged', () => {
    it('sets exists trusted app uninitialised', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAssignableListExistDataChanged',
        payload: createUninitialisedResourceState(),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: {
            type: 'UninitialisedResourceState',
          },
        },
      });
    });
    it('sets exists trusted app loading', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAssignableListExistDataChanged',
        payload: createLoadingResourceState(createUninitialisedResourceState()),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: {
            previousState: {
              type: 'UninitialisedResourceState',
            },
            type: 'LoadingResourceState',
          },
        },
      });
    });
    it('sets exists trusted app loaded negative', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAssignableListExistDataChanged',
        payload: createLoadedResourceState(false),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: {
            data: false,
            type: 'LoadedResourceState',
          },
        },
      });
    });
    it('sets exists trusted app loaded positive', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAssignableListExistDataChanged',
        payload: createLoadedResourceState(true),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: {
            data: true,
            type: 'LoadedResourceState',
          },
        },
      });
    });
    it('sets exists trusted app failed', () => {
      const result = policyTrustedAppsReducer(initialState, {
        type: 'policyArtifactsAssignableListExistDataChanged',
        payload: createFailedResourceState(getAPIError()),
      });

      expect(result).toStrictEqual({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: {
            type: 'FailedResourceState',
            error: getAPIError(),
            lastLoadedState: undefined,
          },
        },
      });
    });
  });
});
