/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyMiddleware, createStore } from 'redux';

import { createSpyMiddleware } from '../../../../common/store/test_utils';

import {
  createFailedListViewWithPagination,
  createListLoadedResourceState,
  createLoadedListViewWithPagination,
  createLoadingListViewWithPagination,
  createSampleTrustedApp,
  createSampleTrustedApps,
  createServerApiError,
  createUserChangedUrlAction,
} from '../test_utils';

import { TrustedAppsService } from '../service';
import { PaginationInfo, TrustedAppsListPageState } from '../state';
import { initialTrustedAppsPageState, trustedAppsPageReducer } from './reducer';
import { createTrustedAppsPageMiddleware } from './middleware';

const initialNow = 111111;
const dateNowMock = jest.fn();
dateNowMock.mockReturnValue(initialNow);

Date.now = dateNowMock;

const initialState = initialTrustedAppsPageState();

const createGetTrustedListAppsResponse = (pagination: PaginationInfo, totalItemsCount: number) => ({
  data: createSampleTrustedApps(pagination),
  page: pagination.index,
  per_page: pagination.size,
  total: totalItemsCount,
});

const createTrustedAppsServiceMock = (): jest.Mocked<TrustedAppsService> => ({
  getTrustedAppsList: jest.fn(),
  deleteTrustedApp: jest.fn(),
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

beforeEach(() => {
  dateNowMock.mockReturnValue(initialNow);
});

describe('middleware', () => {
  describe('initial state', () => {
    it('sets initial state properly', async () => {
      expect(createStoreSetup(createTrustedAppsServiceMock()).store.getState()).toStrictEqual(
        initialState
      );
    });
  });

  describe('refreshing list resource state', () => {
    it('refreshes the list when location changes and data gets outdated', async () => {
      const pagination = { index: 2, size: 50 };
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(
        createGetTrustedListAppsResponse(pagination, 500)
      );

      store.dispatch(createUserChangedUrlAction('/trusted_apps', '?page_index=2&page_size=50'));

      expect(store.getState()).toStrictEqual({
        ...initialState,
        listView: createLoadingListViewWithPagination(initialNow, pagination),
        active: true,
      });

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...initialState,
        listView: createLoadedListViewWithPagination(initialNow, pagination, pagination, 500),
        active: true,
      });
    });

    it('does not refresh the list when location changes and data does not get outdated', async () => {
      const pagination = { index: 2, size: 50 };
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(
        createGetTrustedListAppsResponse(pagination, 500)
      );

      store.dispatch(createUserChangedUrlAction('/trusted_apps', '?page_index=2&page_size=50'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      store.dispatch(createUserChangedUrlAction('/trusted_apps', '?page_index=2&page_size=50'));

      expect(service.getTrustedAppsList).toBeCalledTimes(1);
      expect(store.getState()).toStrictEqual({
        ...initialState,
        listView: createLoadedListViewWithPagination(initialNow, pagination, pagination, 500),
        active: true,
      });
    });

    it('refreshes the list when data gets outdated with and outdate action', async () => {
      const newNow = 222222;
      const pagination = { index: 0, size: 10 };
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(
        createGetTrustedListAppsResponse(pagination, 500)
      );

      store.dispatch(createUserChangedUrlAction('/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      dateNowMock.mockReturnValue(newNow);

      store.dispatch({ type: 'trustedAppsListDataOutdated' });

      expect(store.getState()).toStrictEqual({
        ...initialState,
        listView: createLoadingListViewWithPagination(
          newNow,
          pagination,
          createListLoadedResourceState(pagination, 500, initialNow)
        ),
        active: true,
      });

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...initialState,
        listView: createLoadedListViewWithPagination(newNow, pagination, pagination, 500),
        active: true,
      });
    });

    it('set list resource state to failed when failing to load data', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockRejectedValue(createServerApiError('Internal Server Error'));

      store.dispatch(createUserChangedUrlAction('/trusted_apps', '?page_index=2&page_size=50'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...initialState,
        listView: createFailedListViewWithPagination(
          initialNow,
          { index: 2, size: 50 },
          createServerApiError('Internal Server Error')
        ),
        active: true,
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
    const pagination = { index: 0, size: 10 };
    const getTrustedAppsListResponse = createGetTrustedListAppsResponse(pagination, 500);
    const listView = createLoadedListViewWithPagination(initialNow, pagination, pagination, 500);
    const listViewNew = createLoadedListViewWithPagination(newNow, pagination, pagination, 500);
    const testStartState = { ...initialState, listView, active: true };

    it('does not submit when entry is undefined', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockResolvedValue();

      store.dispatch(createUserChangedUrlAction('/trusted_apps'));

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

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockResolvedValue();

      store.dispatch(createUserChangedUrlAction('/trusted_apps'));

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

      expect(store.getState()).toStrictEqual({ ...testStartState, listView: listViewNew });
      expect(service.deleteTrustedApp).toBeCalledWith({ id: '3' });
      expect(service.deleteTrustedApp).toBeCalledTimes(1);
    });

    it('does not submit twice', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockResolvedValue();

      store.dispatch(createUserChangedUrlAction('/trusted_apps'));

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

      expect(store.getState()).toStrictEqual({ ...testStartState, listView: listViewNew });
      expect(service.deleteTrustedApp).toBeCalledWith({ id: '3' });
      expect(service.deleteTrustedApp).toBeCalledTimes(1);
    });

    it('does not submit when server response with failure', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockRejectedValue(notFoundError);

      store.dispatch(createUserChangedUrlAction('/trusted_apps'));

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

      expect(store.getState()).toStrictEqual({
        ...testStartState,
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
