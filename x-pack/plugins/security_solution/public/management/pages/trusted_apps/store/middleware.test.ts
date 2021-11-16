/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMiddleware, createStore } from 'redux';

import { createSpyMiddleware } from '../../../../common/store/test_utils';

import {
  createDefaultPagination,
  createListLoadedResourceState,
  createLoadedListViewWithPagination,
  createSampleTrustedApp,
  createSampleTrustedApps,
  createServerApiError,
  createUninitialisedResourceState,
  createUserChangedUrlAction,
} from '../test_utils';

import { TrustedAppsService } from '../service';
import { Pagination, TrustedAppsListPageLocation, TrustedAppsListPageState } from '../state';
import { initialTrustedAppsPageState } from './builders';
import { trustedAppsPageReducer } from './reducer';
import { createTrustedAppsPageMiddleware } from './middleware';
import { Immutable } from '../../../../../common/endpoint/types';
import { getGeneratedPolicyResponse } from './mocks';

const initialNow = 111111;
const dateNowMock = jest.fn();
dateNowMock.mockReturnValue(initialNow);

Date.now = dateNowMock;

const initialState: Immutable<TrustedAppsListPageState> = initialTrustedAppsPageState();

const createGetTrustedListAppsResponse = (pagination: Partial<Pagination>) => {
  const fullPagination = { ...createDefaultPagination(), ...pagination };

  return {
    data: createSampleTrustedApps(pagination),
    page: fullPagination.pageIndex,
    per_page: fullPagination.pageSize,
    total: fullPagination.totalItemCount,
  };
};

const createTrustedAppsServiceMock = (): jest.Mocked<TrustedAppsService> => ({
  getTrustedAppsList: jest.fn(),
  deleteTrustedApp: jest.fn(),
  createTrustedApp: jest.fn(),
  getPolicyList: jest.fn(),
  updateTrustedApp: jest.fn(),
  getTrustedApp: jest.fn(),
  assignPolicyToTrustedApps: jest.fn(),
  removePolicyFromTrustedApps: jest.fn(),
});

const createStoreSetup = (trustedAppsService: TrustedAppsService) => {
  const spyMiddleware = createSpyMiddleware<TrustedAppsListPageState>();

  return {
    spyMiddleware,
    store: createStore(
      trustedAppsPageReducer,
      applyMiddleware(
        createTrustedAppsPageMiddleware(trustedAppsService),
        spyMiddleware.actionSpyMiddleware
      )
    ),
  };
};

describe('middleware', () => {
  type TrustedAppsEntriesExistState = Pick<TrustedAppsListPageState, 'entriesExist'>;
  const entriesExistLoadedState = (): TrustedAppsEntriesExistState => {
    return {
      entriesExist: {
        data: true,
        type: 'LoadedResourceState',
      },
    };
  };
  const entriesExistLoadingState = (): TrustedAppsEntriesExistState => {
    return {
      entriesExist: {
        previousState: {
          type: 'UninitialisedResourceState',
        },
        type: 'LoadingResourceState',
      },
    };
  };

  const createLocationState = (
    params?: Partial<TrustedAppsListPageLocation>
  ): TrustedAppsListPageLocation => {
    return {
      ...initialState.location,
      ...(params ?? {}),
    };
  };

  beforeEach(() => {
    dateNowMock.mockReturnValue(initialNow);
  });

  describe('initial state', () => {
    it('sets initial state properly', async () => {
      expect(createStoreSetup(createTrustedAppsServiceMock()).store.getState()).toStrictEqual(
        initialState
      );
    });
  });

  describe('refreshing list resource state', () => {
    it('refreshes the list when location changes and data gets outdated', async () => {
      const pagination = { pageIndex: 2, pageSize: 50 };
      const location = createLocationState({
        page_index: 2,
        page_size: 50,
      });
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(createGetTrustedListAppsResponse(pagination));

      store.dispatch(
        createUserChangedUrlAction('/administration/trusted_apps', '?page_index=2&page_size=50')
      );

      expect(store.getState()).toStrictEqual({
        ...initialState,
        listView: {
          listResourceState: {
            type: 'LoadingResourceState',
            previousState: createUninitialisedResourceState(),
          },
          freshDataTimestamp: initialNow,
        },
        active: true,
        location,
      });

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadingState(),
        listView: createLoadedListViewWithPagination(initialNow, pagination),
        active: true,
        location,
      });
    });

    it('does not refresh the list when location changes and data does not get outdated', async () => {
      const pagination = { pageIndex: 2, pageSize: 50 };
      const location = createLocationState({
        page_index: 2,
        page_size: 50,
      });
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(createGetTrustedListAppsResponse(pagination));

      store.dispatch(
        createUserChangedUrlAction('/administration/trusted_apps', '?page_index=2&page_size=50')
      );

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      store.dispatch(
        createUserChangedUrlAction('/administration/trusted_apps', '?page_index=2&page_size=50')
      );

      expect(service.getTrustedAppsList).toBeCalledTimes(2);
      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadingState(),
        listView: createLoadedListViewWithPagination(initialNow, pagination),
        active: true,
        location,
      });
    });

    it('refreshes the list when data gets outdated with and outdate action', async () => {
      const newNow = 222222;
      const pagination = { pageIndex: 0, pageSize: 10 };
      const location = createLocationState();
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);
      const policiesResponse = getGeneratedPolicyResponse();

      service.getTrustedAppsList.mockResolvedValue(createGetTrustedListAppsResponse(pagination));
      service.getPolicyList.mockResolvedValue(policiesResponse);

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      dateNowMock.mockReturnValue(newNow);

      store.dispatch({ type: 'trustedAppsListDataOutdated' });

      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadingState(),
        listView: {
          listResourceState: {
            type: 'LoadingResourceState',
            previousState: createListLoadedResourceState(pagination, initialNow),
          },
          freshDataTimestamp: newNow,
        },
        active: true,
        location,
      });

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');
      await spyMiddleware.waitForAction('trustedAppsPoliciesStateChanged');

      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadedState(),
        policies: {
          data: policiesResponse,
          type: 'LoadedResourceState',
        },
        listView: createLoadedListViewWithPagination(newNow, pagination),
        active: true,
        location,
      });
    });

    it('set list resource state to failed when failing to load data', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockRejectedValue({
        body: createServerApiError('Internal Server Error'),
      });

      store.dispatch(
        createUserChangedUrlAction('/administration/trusted_apps', '?page_index=2&page_size=50')
      );

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadingState(),
        listView: {
          listResourceState: {
            type: 'FailedResourceState',
            error: createServerApiError('Internal Server Error'),
            lastLoadedState: undefined,
          },
          freshDataTimestamp: initialNow,
        },
        active: true,
        location: createLocationState({
          page_index: 2,
          page_size: 50,
        }),
      });

      const infiniteLoopTest = async () => {
        await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');
      };

      await expect(infiniteLoopTest).rejects.not.toBeNull();
    });
  });

  describe('submitting deletion dialog', () => {
    const newNow = 222222;
    const entry = createSampleTrustedApp(3);
    const notFoundError = createServerApiError('Not Found');
    const pagination = { pageIndex: 0, pageSize: 10 };
    const location = createLocationState();
    const getTrustedAppsListResponse = createGetTrustedListAppsResponse(pagination);
    const listView = createLoadedListViewWithPagination(initialNow, pagination);
    const listViewNew = createLoadedListViewWithPagination(newNow, pagination);
    const testStartState = {
      ...initialState,
      ...entriesExistLoadingState(),
      listView,
      active: true,
      location,
    };

    it('does not submit when entry is undefined', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockResolvedValue();

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        deletionDialog: { ...testStartState.deletionDialog, confirmed: true },
      });
    });

    it('submits successfully when entry is defined', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);
      const policiesResponse = getGeneratedPolicyResponse();

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockResolvedValue();
      service.getPolicyList.mockResolvedValue(policiesResponse);

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      dateNowMock.mockReturnValue(newNow);

      store.dispatch({ type: 'trustedAppDeletionDialogStarted', payload: { entry } });
      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        deletionDialog: {
          entry,
          confirmed: true,
          submissionResourceState: {
            type: 'LoadingResourceState',
            previousState: { type: 'UninitialisedResourceState' },
          },
        },
      });

      await spyMiddleware.waitForAction('trustedAppDeletionSubmissionResourceStateChanged');
      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        ...entriesExistLoadedState(),
        policies: {
          data: policiesResponse,
          type: 'LoadedResourceState',
        },
        listView: listViewNew,
      });
      expect(service.deleteTrustedApp).toBeCalledWith({ id: '3' });
      expect(service.deleteTrustedApp).toBeCalledTimes(1);
    });

    it('does not submit twice', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);
      const policiesResponse = getGeneratedPolicyResponse();

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockResolvedValue();
      service.getPolicyList.mockResolvedValue(policiesResponse);

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      dateNowMock.mockReturnValue(newNow);

      store.dispatch({ type: 'trustedAppDeletionDialogStarted', payload: { entry } });
      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });
      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        deletionDialog: {
          entry,
          confirmed: true,
          submissionResourceState: {
            type: 'LoadingResourceState',
            previousState: { type: 'UninitialisedResourceState' },
          },
        },
      });

      await spyMiddleware.waitForAction('trustedAppDeletionSubmissionResourceStateChanged');
      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        ...entriesExistLoadedState(),
        policies: {
          data: policiesResponse,
          type: 'LoadedResourceState',
        },
        listView: listViewNew,
      });
      expect(service.deleteTrustedApp).toBeCalledWith({ id: '3' });
      expect(service.deleteTrustedApp).toBeCalledTimes(1);
    });

    it('does not submit when server response with failure', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);
      const policiesResponse = getGeneratedPolicyResponse();

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockRejectedValue({ body: notFoundError });
      service.getPolicyList.mockResolvedValue(policiesResponse);

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      store.dispatch({ type: 'trustedAppDeletionDialogStarted', payload: { entry } });
      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        deletionDialog: {
          entry,
          confirmed: true,
          submissionResourceState: {
            type: 'LoadingResourceState',
            previousState: { type: 'UninitialisedResourceState' },
          },
        },
      });

      await spyMiddleware.waitForAction('trustedAppDeletionSubmissionResourceStateChanged');
      await spyMiddleware.waitForAction('trustedAppsPoliciesStateChanged');

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        ...entriesExistLoadedState(),
        policies: {
          data: policiesResponse,
          type: 'LoadedResourceState',
        },
        deletionDialog: {
          entry,
          confirmed: true,
          submissionResourceState: {
            type: 'FailedResourceState',
            error: notFoundError,
            lastLoadedState: undefined,
          },
        },
      });
      expect(service.deleteTrustedApp).toBeCalledWith({ id: '3' });
      expect(service.deleteTrustedApp).toBeCalledTimes(1);
    });
  });
});
