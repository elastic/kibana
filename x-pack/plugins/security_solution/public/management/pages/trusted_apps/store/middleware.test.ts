/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyMiddleware, createStore } from 'redux';

import { createSpyMiddleware } from '../../../../common/store/test_utils';

import {
  createFailedListViewWithPagination,
  createLoadedListViewWithPagination,
  createLoadingListViewWithPagination,
  createSampleTrustedApps,
  createServerApiError,
  createUserChangedUrlAction,
} from '../test_utils';

import { TrustedAppsService } from '../service';
import { PaginationInfo, TrustedAppsListPageState } from '../state';
import { initialTrustedAppsPageState, trustedAppsPageReducer } from './reducer';
import { createTrustedAppsPageMiddleware } from './middleware';

const createGetTrustedListAppsResponse = (pagination: PaginationInfo, totalItemsCount: number) => ({
  data: createSampleTrustedApps(pagination),
  page: pagination.index,
  per_page: pagination.size,
  total: totalItemsCount,
});

const createTrustedAppsServiceMock = (): jest.Mocked<TrustedAppsService> => ({
  getTrustedAppsList: jest.fn(),
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
  describe('refreshing list resource state', () => {
    it('sets initial state properly', async () => {
      expect(createStoreSetup(createTrustedAppsServiceMock()).store.getState()).toStrictEqual(
        initialTrustedAppsPageState
      );
    });

    it('refreshes the list when location changes and data gets outdated', async () => {
      const pagination = { index: 2, size: 50 };
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(
        createGetTrustedListAppsResponse(pagination, 500)
      );

      store.dispatch(createUserChangedUrlAction('/trusted_apps', '?page_index=2&page_size=50'));

      expect(store.getState()).toStrictEqual({
        listView: createLoadingListViewWithPagination(pagination),
        active: true,
      });

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        listView: createLoadedListViewWithPagination(pagination, pagination, 500),
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
        listView: createLoadedListViewWithPagination(pagination, pagination, 500),
        active: true,
      });
    });

    it('set list resource state to faile when failing to load data', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockRejectedValue(createServerApiError('Internal Server Error'));

      store.dispatch(createUserChangedUrlAction('/trusted_apps', '?page_index=2&page_size=50'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        listView: createFailedListViewWithPagination(
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
});
