/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyArtifactsState, PolicyDetailsState } from '../../../types';
import { initialPolicyDetailsState } from '../reducer';
import {
  getAssignableArtifactsList,
  getAssignableArtifactsListIsLoading,
  getUpdateArtifactsIsLoading,
  getUpdateArtifactsIsFailed,
  getUpdateArtifactsLoaded,
  getAssignableArtifactsListExist,
  getAssignableArtifactsListExistIsLoading,
  getUpdateArtifacts,
  doesPolicyTrustedAppsListNeedUpdate,
  isPolicyTrustedAppListLoading,
  getPolicyTrustedAppList,
  getPolicyTrustedAppsListPagination,
  getTrustedAppsListOfAllPolicies,
  getTrustedAppsAllPoliciesById,
} from './trusted_apps_selectors';
import { getCurrentArtifactsLocation, isOnPolicyTrustedAppsView } from './policy_common_selectors';

import { ImmutableObject } from '../../../../../../../common/endpoint/types';
import {
  createLoadedResourceState,
  createUninitialisedResourceState,
  createLoadingResourceState,
  createFailedResourceState,
} from '../../../../../state';
import { MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH } from '../../../../../common/constants';
import {
  getMockListResponse,
  getAPIError,
  getMockCreateResponse,
  getMockPolicyDetailsArtifactListUrlParams,
  getMockPolicyDetailsArtifactsPageLocationUrlParams,
} from '../../../test_utils';
import { getGeneratedPolicyResponse } from '../../../../trusted_apps/store/mocks';

describe('policy trusted apps selectors', () => {
  let initialState: ImmutableObject<PolicyDetailsState>;

  const createArtifactsState = (
    artifacts: Partial<PolicyArtifactsState> = {}
  ): ImmutableObject<PolicyDetailsState> => {
    return {
      ...initialState,
      artifacts: {
        ...initialState.artifacts,
        ...artifacts,
      },
    };
  };

  beforeEach(() => {
    initialState = initialPolicyDetailsState();
  });

  describe('doesPolicyTrustedAppsListNeedUpdate()', () => {
    it('should return true if state is not loaded', () => {
      expect(doesPolicyTrustedAppsListNeedUpdate(initialState)).toBe(true);
    });

    it('should return true if it is loaded, but URL params were changed', () => {
      expect(
        doesPolicyTrustedAppsListNeedUpdate(
          createArtifactsState({
            location: getMockPolicyDetailsArtifactsPageLocationUrlParams({ page_index: 4 }),
            assignedList: createLoadedResourceState({
              location: getMockPolicyDetailsArtifactListUrlParams(),
              artifacts: getMockListResponse(),
            }),
          })
        )
      ).toBe(true);
    });

    it('should return false if state is loaded adn URL params are the same', () => {
      expect(
        doesPolicyTrustedAppsListNeedUpdate(
          createArtifactsState({
            location: getMockPolicyDetailsArtifactsPageLocationUrlParams(),
            assignedList: createLoadedResourceState({
              location: getMockPolicyDetailsArtifactListUrlParams(),
              artifacts: getMockListResponse(),
            }),
          })
        )
      ).toBe(false);
    });
  });

  describe('isPolicyTrustedAppListLoading()', () => {
    it('should return true when loading data', () => {
      expect(
        isPolicyTrustedAppListLoading(
          createArtifactsState({
            assignedList: createLoadingResourceState(createUninitialisedResourceState()),
          })
        )
      ).toBe(true);
    });

    it.each([
      ['uninitialized', createUninitialisedResourceState() as PolicyArtifactsState['assignedList']],
      ['loaded', createLoadedResourceState({}) as PolicyArtifactsState['assignedList']],
      ['failed', createFailedResourceState({}) as PolicyArtifactsState['assignedList']],
    ])('should return false when state is %s', (__, assignedListState) => {
      expect(
        isPolicyTrustedAppListLoading(createArtifactsState({ assignedList: assignedListState }))
      ).toBe(false);
    });
  });

  describe('getPolicyTrustedAppList()', () => {
    it('should return the list of trusted apps', () => {
      const listResponse = getMockListResponse();

      expect(
        getPolicyTrustedAppList(
          createArtifactsState({
            location: getMockPolicyDetailsArtifactsPageLocationUrlParams(),
            assignedList: createLoadedResourceState({
              location: getMockPolicyDetailsArtifactListUrlParams(),
              artifacts: listResponse,
            }),
          })
        )
      ).toEqual(listResponse.data);
    });

    it('should return empty array if no data is loaded', () => {
      expect(getPolicyTrustedAppList(initialState)).toEqual([]);
    });
  });

  describe('getPolicyTrustedAppsListPagination()', () => {
    it('should return default pagination data even if no api data is available', () => {
      expect(getPolicyTrustedAppsListPagination(initialState)).toEqual({
        pageIndex: 0,
        pageSize: 10,
        pageSizeOptions: [10, 20, 50],
        totalItemCount: 0,
      });
    });

    it('should return pagination data based on api response data', () => {
      const listResponse = getMockListResponse();

      listResponse.page = 6;
      listResponse.per_page = 100;
      listResponse.total = 1000;

      expect(
        getPolicyTrustedAppsListPagination(
          createArtifactsState({
            location: getMockPolicyDetailsArtifactsPageLocationUrlParams({
              page_index: 5,
              page_size: 100,
            }),
            assignedList: createLoadedResourceState({
              location: getMockPolicyDetailsArtifactListUrlParams({
                page_index: 5,
                page_size: 100,
              }),
              artifacts: listResponse,
            }),
          })
        )
      ).toEqual({
        pageIndex: 5,
        pageSize: 100,
        pageSizeOptions: [10, 20, 50],
        totalItemCount: 1000,
      });
    });
  });

  describe('getTrustedAppsListOfAllPolicies()', () => {
    it('should return the loaded list of policies', () => {
      const policiesApiResponse = getGeneratedPolicyResponse();

      expect(
        getTrustedAppsListOfAllPolicies(
          createArtifactsState({
            policies: createLoadedResourceState(policiesApiResponse),
          })
        )
      ).toEqual(policiesApiResponse.items);
    });

    it('should return an empty array of no policy data was loaded yet', () => {
      expect(getTrustedAppsListOfAllPolicies(initialState)).toEqual([]);
    });
  });

  describe('getTrustedAppsAllPoliciesById()', () => {
    it('should return an empty object if no polices', () => {
      expect(getTrustedAppsAllPoliciesById(initialState)).toEqual({});
    });

    it('should return an object with policy id and policy data', () => {
      const policiesApiResponse = getGeneratedPolicyResponse();

      expect(
        getTrustedAppsAllPoliciesById(
          createArtifactsState({
            policies: createLoadedResourceState(policiesApiResponse),
          })
        )
      ).toEqual({ [policiesApiResponse.items[0].id]: policiesApiResponse.items[0] });
    });
  });

  describe('isOnPolicyTrustedAppsPage()', () => {
    it('when location is on policy trusted apps page', () => {
      const isOnPage = isOnPolicyTrustedAppsView({
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
      const isOnPage = isOnPolicyTrustedAppsView({
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

  describe('getAssignableArtifactsList()', () => {
    it('when assignable list is uninitialised', () => {
      const assignableList = getAssignableArtifactsList(initialState);
      expect(assignableList).toBeUndefined();
    });
    it('when assignable list is loading', () => {
      const assignableList = getAssignableArtifactsList({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableList: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(assignableList).toBeUndefined();
    });
    it('when assignable list is loaded', () => {
      const assignableList = getAssignableArtifactsList({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableList: createLoadedResourceState(getMockListResponse()),
        },
      });
      expect(assignableList).toEqual(getMockListResponse());
    });
  });

  describe('getAssignableArtifactsListIsLoading()', () => {
    it('when assignable list is loading', () => {
      const isLoading = getAssignableArtifactsListIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableList: createLoadingResourceState(createUninitialisedResourceState()),
        },
      });
      expect(isLoading).toBeTruthy();
    });
    it('when assignable list is uninitialised', () => {
      const isLoading = getAssignableArtifactsListIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableList: createUninitialisedResourceState(),
        },
      });
      expect(isLoading).toBeFalsy();
    });
    it('when assignable list is loaded', () => {
      const isLoading = getAssignableArtifactsListIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableList: createLoadedResourceState(getMockListResponse()),
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
          trustedAppsToUpdate: createLoadedResourceState([getMockCreateResponse()]),
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
          trustedAppsToUpdate: createLoadedResourceState([getMockCreateResponse()]),
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
          trustedAppsToUpdate: createLoadedResourceState([getMockCreateResponse()]),
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
          trustedAppsToUpdate: createLoadedResourceState([getMockCreateResponse()]),
        },
      });
      expect(isLoading).toEqual([getMockCreateResponse()]);
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

  describe('getAssignableArtifactsListExist()', () => {
    it('when check artifacts exists is loading', () => {
      const exists = getAssignableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createLoadingResourceState(
            createUninitialisedResourceState()
          ),
        },
      });
      expect(exists).toBeFalsy();
    });
    it('when check artifacts exists is uninitialised', () => {
      const exists = getAssignableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createUninitialisedResourceState(),
        },
      });
      expect(exists).toBeFalsy();
    });
    it('when check artifacts exists is loaded with negative result', () => {
      const exists = getAssignableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createLoadedResourceState(false),
        },
      });
      expect(exists).toBeFalsy();
    });
    it('when check artifacts exists is loaded with positive result', () => {
      const exists = getAssignableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createLoadedResourceState(true),
        },
      });
      expect(exists).toBeTruthy();
    });
    it('when check artifacts exists has failed', () => {
      const exists = getAssignableArtifactsListExist({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createFailedResourceState(getAPIError()),
        },
      });
      expect(exists).toBeFalsy();
    });
  });

  describe('getAssignableArtifactsListExistIsLoading()', () => {
    it('when check artifacts exists is loading', () => {
      const isLoading = getAssignableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createLoadingResourceState(
            createUninitialisedResourceState()
          ),
        },
      });
      expect(isLoading).toBeTruthy();
    });
    it('when check artifacts exists is uninitialised', () => {
      const isLoading = getAssignableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createUninitialisedResourceState(),
        },
      });
      expect(isLoading).toBeFalsy();
    });
    it('when check artifacts exists is loaded with negative result', () => {
      const isLoading = getAssignableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createLoadedResourceState(false),
        },
      });
      expect(isLoading).toBeFalsy();
    });
    it('when check artifacts exists is loaded with positive result', () => {
      const isLoading = getAssignableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createLoadedResourceState(true),
        },
      });
      expect(isLoading).toBeFalsy();
    });
    it('when check artifacts exists has failed', () => {
      const isLoading = getAssignableArtifactsListExistIsLoading({
        ...initialState,
        artifacts: {
          ...initialState.artifacts,
          assignableListEntriesExist: createFailedResourceState(getAPIError()),
        },
      });
      expect(isLoading).toBeFalsy();
    });
  });
});
