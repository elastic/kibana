/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TrustedApp } from '../../../../../common/endpoint/types';

import {
  FailedResourceState,
  LoadedResourceState,
  LoadingResourceState,
  PaginationInfo,
  TrustedAppsListData,
  TrustedAppsListPageState,
  UninitialisedResourceState,
} from '../state';

import {
  getCurrentListResourceState,
  getLastLoadedListResourceState,
  getListCurrentPageIndex,
  getListCurrentPageSize,
  getListErrorMessage,
  getListItems,
  getListTotalItemsCount,
  isListLoading,
  needsRefreshOfListData,
} from './selectors';

const OS_LIST: Array<TrustedApp['os']> = ['windows', 'macos', 'linux'];

const createSampleTrustedApps = (paginationInfo: PaginationInfo): TrustedApp[] => {
  return [...new Array(paginationInfo.size).keys()].map((i) => ({
    id: String(paginationInfo.index + i),
    name: `trusted app ${paginationInfo.index + i}`,
    description: `Trusted App ${paginationInfo.index + i}`,
    created_at: '1 minute ago',
    created_by: 'someone',
    os: OS_LIST[i % 3],
    entries: [],
  }));
};

const createTrustedAppsListData = (paginationInfo: PaginationInfo, totalItemsCount: number) => ({
  items: createSampleTrustedApps(paginationInfo),
  totalItemsCount,
  paginationInfo,
});

const createUninitialisedResourceState = (): UninitialisedResourceState => ({
  type: 'UninitialisedResourceState',
});

const createListLoadedResourceState = (
  paginationInfo: PaginationInfo,
  totalItemsCount: number
): LoadedResourceState<TrustedAppsListData> => ({
  type: 'LoadedResourceState',
  data: createTrustedAppsListData(paginationInfo, totalItemsCount),
});

const createListFailedResourceState = (
  message: string,
  lastLoadedState?: LoadedResourceState<TrustedAppsListData>
): FailedResourceState<TrustedAppsListData> => ({
  type: 'FailedResourceState',
  error: {
    statusCode: 500,
    error: 'Internal Server Error',
    message,
  },
  lastLoadedState,
});

const createListComplexLoadingResourceState = (
  paginationInfo: PaginationInfo,
  totalItemsCount: number
): LoadingResourceState<TrustedAppsListData> => ({
  type: 'LoadingResourceState',
  previousState: createListFailedResourceState(
    'Internal Server Error',
    createListLoadedResourceState(paginationInfo, totalItemsCount)
  ),
});

const defaultPaginationInfo = { index: 0, size: 20 };

const createDefaultListView = () => ({
  currentListResourceState: createUninitialisedResourceState(),
  currentPaginationInfo: defaultPaginationInfo,
});

const createListViewWithPagination = (
  paginationInfo: PaginationInfo = defaultPaginationInfo,
  currentPaginationInfo: PaginationInfo = defaultPaginationInfo
): TrustedAppsListPageState['listView'] => ({
  currentListResourceState: createListLoadedResourceState(paginationInfo, 200),
  currentPaginationInfo,
});

describe('selectors', () => {
  describe('needsRefreshOfListData()', () => {
    it('returns false for outdated resource state and inactive state', () => {
      expect(needsRefreshOfListData({ listView: createDefaultListView(), active: false })).toBe(
        false
      );
    });

    it('returns true for outdated resource state and active state', () => {
      expect(needsRefreshOfListData({ listView: createDefaultListView(), active: true })).toBe(
        true
      );
    });

    it('returns true when current loaded page index is outdated', () => {
      const listView = createListViewWithPagination({ index: 1, size: 20 });

      expect(needsRefreshOfListData({ listView, active: true })).toBe(true);
    });

    it('returns true when current loaded page size is outdated', () => {
      const listView = createListViewWithPagination({ index: 0, size: 50 });

      expect(needsRefreshOfListData({ listView, active: true })).toBe(true);
    });

    it('returns false when current loaded data is up to date', () => {
      const listView = createListViewWithPagination();

      expect(needsRefreshOfListData({ listView, active: true })).toBe(false);
    });
  });

  describe('getCurrentListResourceState()', () => {
    it('returns current list resource state', () => {
      const listView = createDefaultListView();

      expect(getCurrentListResourceState({ listView, active: false })).toStrictEqual(
        createUninitialisedResourceState()
      );
    });
  });

  describe('getLastLoadedListResourceState()', () => {
    it('returns last loaded list resource state', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(defaultPaginationInfo, 200),
        currentPaginationInfo: defaultPaginationInfo,
      };

      expect(getLastLoadedListResourceState({ listView, active: false })).toStrictEqual(
        createListLoadedResourceState(defaultPaginationInfo, 200)
      );
    });
  });

  describe('getListItems()', () => {
    it('returns empty list when no valid data loaded', () => {
      expect(getListItems({ listView: createDefaultListView(), active: false })).toStrictEqual([]);
    });

    it('returns last loaded list items', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(defaultPaginationInfo, 200),
        currentPaginationInfo: defaultPaginationInfo,
      };

      expect(getListItems({ listView, active: false })).toStrictEqual(
        createSampleTrustedApps(defaultPaginationInfo)
      );
    });
  });

  describe('getListTotalItemsCount()', () => {
    it('returns 0 when no valid data loaded', () => {
      expect(getListTotalItemsCount({ listView: createDefaultListView(), active: false })).toBe(0);
    });

    it('returns last loaded total items count', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(defaultPaginationInfo, 200),
        currentPaginationInfo: defaultPaginationInfo,
      };

      expect(getListTotalItemsCount({ listView, active: false })).toBe(200);
    });
  });

  describe('getListCurrentPageIndex()', () => {
    it('returns page index', () => {
      expect(getListCurrentPageIndex({ listView: createDefaultListView(), active: false })).toBe(0);
    });
  });

  describe('getListCurrentPageSize()', () => {
    it('returns page index', () => {
      expect(getListCurrentPageSize({ listView: createDefaultListView(), active: false })).toBe(20);
    });
  });

  describe('getListErrorMessage()', () => {
    it('returns undefined when not in failed state', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(defaultPaginationInfo, 200),
        currentPaginationInfo: defaultPaginationInfo,
      };

      expect(getListErrorMessage({ listView, active: false })).toBeUndefined();
    });

    it('returns message when not in failed state', () => {
      const listView = {
        currentListResourceState: createListFailedResourceState('Internal Server Error'),
        currentPaginationInfo: defaultPaginationInfo,
      };

      expect(getListErrorMessage({ listView, active: false })).toBe('Internal Server Error');
    });
  });

  describe('isListLoading()', () => {
    it('returns false when no loading is happening', () => {
      expect(isListLoading({ listView: createDefaultListView(), active: false })).toBe(false);
    });

    it('returns true when loading is in progress', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(defaultPaginationInfo, 200),
        currentPaginationInfo: defaultPaginationInfo,
      };

      expect(isListLoading({ listView, active: false })).toBe(true);
    });
  });
});
