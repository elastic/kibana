/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

import {
  createDefaultListView,
  createDefaultPaginationInfo,
  createListComplexLoadingResourceState,
  createListFailedResourceState,
  createListLoadedResourceState,
  createLoadedListViewWithPagination,
  createSampleTrustedApps,
  createUninitialisedResourceState,
} from '../test_utils';

describe('selectors', () => {
  describe('needsRefreshOfListData()', () => {
    it('returns false for outdated resource state and inactive state', () => {
      expect(
        needsRefreshOfListData({
          listView: createDefaultListView(),
          active: false,
          createView: undefined,
        })
      ).toBe(false);
    });

    it('returns true for outdated resource state and active state', () => {
      expect(
        needsRefreshOfListData({
          listView: createDefaultListView(),
          active: true,
          createView: undefined,
        })
      ).toBe(true);
    });

    it('returns true when current loaded page index is outdated', () => {
      const listView = createLoadedListViewWithPagination({ index: 1, size: 20 });

      expect(needsRefreshOfListData({ listView, active: true, createView: undefined })).toBe(true);
    });

    it('returns true when current loaded page size is outdated', () => {
      const listView = createLoadedListViewWithPagination({ index: 0, size: 50 });

      expect(needsRefreshOfListData({ listView, active: true, createView: undefined })).toBe(true);
    });

    it('returns false when current loaded data is up to date', () => {
      const listView = createLoadedListViewWithPagination();

      expect(needsRefreshOfListData({ listView, active: true, createView: undefined })).toBe(false);
    });
  });

  describe('getCurrentListResourceState()', () => {
    it('returns current list resource state', () => {
      const listView = createDefaultListView();

      expect(
        getCurrentListResourceState({ listView, active: false, createView: undefined })
      ).toStrictEqual(createUninitialisedResourceState());
    });
  });

  describe('getLastLoadedListResourceState()', () => {
    it('returns last loaded list resource state', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(
          createDefaultPaginationInfo(),
          200
        ),
        currentPaginationInfo: createDefaultPaginationInfo(),
        show: undefined,
      };

      expect(
        getLastLoadedListResourceState({ listView, active: false, createView: undefined })
      ).toStrictEqual(createListLoadedResourceState(createDefaultPaginationInfo(), 200));
    });
  });

  describe('getListItems()', () => {
    it('returns empty list when no valid data loaded', () => {
      expect(
        getListItems({ listView: createDefaultListView(), active: false, createView: undefined })
      ).toStrictEqual([]);
    });

    it('returns last loaded list items', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(
          createDefaultPaginationInfo(),
          200
        ),
        currentPaginationInfo: createDefaultPaginationInfo(),
        show: undefined,
      };

      expect(getListItems({ listView, active: false, createView: undefined })).toStrictEqual(
        createSampleTrustedApps(createDefaultPaginationInfo())
      );
    });
  });

  describe('getListTotalItemsCount()', () => {
    it('returns 0 when no valid data loaded', () => {
      expect(
        getListTotalItemsCount({
          listView: createDefaultListView(),
          active: false,
          createView: undefined,
        })
      ).toBe(0);
    });

    it('returns last loaded total items count', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(
          createDefaultPaginationInfo(),
          200
        ),
        currentPaginationInfo: createDefaultPaginationInfo(),
        show: undefined,
      };

      expect(getListTotalItemsCount({ listView, active: false, createView: undefined })).toBe(200);
    });
  });

  describe('getListCurrentPageIndex()', () => {
    it('returns page index', () => {
      expect(
        getListCurrentPageIndex({
          listView: createDefaultListView(),
          active: false,
          createView: undefined,
        })
      ).toBe(0);
    });
  });

  describe('getListCurrentPageSize()', () => {
    it('returns page index', () => {
      expect(
        getListCurrentPageSize({
          listView: createDefaultListView(),
          active: false,
          createView: undefined,
        })
      ).toBe(20);
    });
  });

  describe('getListErrorMessage()', () => {
    it('returns undefined when not in failed state', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(
          createDefaultPaginationInfo(),
          200
        ),
        currentPaginationInfo: createDefaultPaginationInfo(),
        show: undefined,
      };

      expect(
        getListErrorMessage({ listView, active: false, createView: undefined })
      ).toBeUndefined();
    });

    it('returns message when not in failed state', () => {
      const listView = {
        currentListResourceState: createListFailedResourceState('Internal Server Error'),
        currentPaginationInfo: createDefaultPaginationInfo(),
        show: undefined,
      };

      expect(getListErrorMessage({ listView, active: false, createView: undefined })).toBe(
        'Internal Server Error'
      );
    });
  });

  describe('isListLoading()', () => {
    it('returns false when no loading is happening', () => {
      expect(
        isListLoading({ listView: createDefaultListView(), active: false, createView: undefined })
      ).toBe(false);
    });

    it('returns true when loading is in progress', () => {
      const listView = {
        currentListResourceState: createListComplexLoadingResourceState(
          createDefaultPaginationInfo(),
          200
        ),
        currentPaginationInfo: createDefaultPaginationInfo(),
        show: undefined,
      };

      expect(isListLoading({ listView, active: false, createView: undefined })).toBe(true);
    });
  });
});
