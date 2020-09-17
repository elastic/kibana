/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AsyncResourceState, TrustedAppsListPageState } from '../state';
import { initialTrustedAppsPageState } from './reducer';
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
  isDeletionDialogOpen,
  isDeletionInProgress,
  isDeletionSuccessful,
  getDeletionError,
  getDeletionDialogEntry,
  getDeletionSubmissionResourceState,
} from './selectors';

import {
  createDefaultListView,
  createDefaultPaginationInfo,
  createListComplexLoadingResourceState,
  createListFailedResourceState,
  createListLoadedResourceState,
  createLoadedListViewWithPagination,
  createSampleTrustedApp,
  createSampleTrustedApps,
  createServerApiError,
  createUninitialisedResourceState,
} from '../test_utils';

const initialNow = 111111;
const dateNowMock = jest.fn();
dateNowMock.mockReturnValue(initialNow);

Date.now = dateNowMock;

const initialState = initialTrustedAppsPageState();

const createStateWithDeletionSubmissionResourceState = (
  submissionResourceState: AsyncResourceState
): TrustedAppsListPageState => ({
  ...initialState,
  deletionDialog: { ...initialState.deletionDialog, submissionResourceState },
});

describe('selectors', () => {
  describe('needsRefreshOfListData()', () => {
    it('returns false for outdated resource state and inactive state', () => {
      expect(needsRefreshOfListData(initialState)).toBe(false);
    });

    it('returns true for outdated resource state and active state', () => {
      expect(needsRefreshOfListData({ ...initialState, active: true })).toBe(true);
    });

    it('returns true when current loaded page index is outdated', () => {
      const listView = createLoadedListViewWithPagination(initialNow, { index: 1, size: 20 });

      expect(needsRefreshOfListData({ ...initialState, listView, active: true })).toBe(true);
    });

    it('returns true when current loaded page size is outdated', () => {
      const listView = createLoadedListViewWithPagination(initialNow, { index: 0, size: 50 });

      expect(needsRefreshOfListData({ ...initialState, listView, active: true })).toBe(true);
    });

    it('returns true when current loaded data timestamp is outdated', () => {
      const listView = createLoadedListViewWithPagination(222222);

      expect(needsRefreshOfListData({ ...initialState, listView, active: true })).toBe(true);
    });

    it('returns false when current loaded data is up to date', () => {
      const listView = createLoadedListViewWithPagination(initialNow);

      expect(needsRefreshOfListData({ ...initialState, listView, active: true })).toBe(false);
    });
  });

  describe('getCurrentListResourceState()', () => {
    it('returns current list resource state', () => {
      const state = { ...initialState, listView: createDefaultListView(initialNow) };

      expect(getCurrentListResourceState(state)).toStrictEqual(createUninitialisedResourceState());
    });
  });

  describe('getLastLoadedListResourceState()', () => {
    it('returns last loaded list resource state', () => {
      const state = {
        ...initialState,
        listView: {
          currentListResourceState: createListComplexLoadingResourceState(
            createDefaultPaginationInfo(),
            200,
            initialNow
          ),
          currentPaginationInfo: createDefaultPaginationInfo(),
          freshDataTimestamp: initialNow,
        },
      };

      expect(getLastLoadedListResourceState(state)).toStrictEqual(
        createListLoadedResourceState(createDefaultPaginationInfo(), 200, initialNow)
      );
    });
  });

  describe('getListItems()', () => {
    it('returns empty list when no valid data loaded', () => {
      const state = { ...initialState, listView: createDefaultListView(initialNow) };

      expect(getListItems(state)).toStrictEqual([]);
    });

    it('returns last loaded list items', () => {
      const state = {
        ...initialState,
        listView: {
          currentListResourceState: createListComplexLoadingResourceState(
            createDefaultPaginationInfo(),
            200,
            initialNow
          ),
          currentPaginationInfo: createDefaultPaginationInfo(),
          freshDataTimestamp: initialNow,
        },
      };

      expect(getListItems(state)).toStrictEqual(
        createSampleTrustedApps(createDefaultPaginationInfo())
      );
    });
  });

  describe('getListTotalItemsCount()', () => {
    it('returns 0 when no valid data loaded', () => {
      const state = { ...initialState, listView: createDefaultListView(initialNow) };

      expect(getListTotalItemsCount(state)).toBe(0);
    });

    it('returns last loaded total items count', () => {
      const state = {
        ...initialState,
        listView: {
          currentListResourceState: createListComplexLoadingResourceState(
            createDefaultPaginationInfo(),
            200,
            initialNow
          ),
          currentPaginationInfo: createDefaultPaginationInfo(),
          freshDataTimestamp: initialNow,
        },
      };

      expect(getListTotalItemsCount(state)).toBe(200);
    });
  });

  describe('getListCurrentPageIndex()', () => {
    it('returns page index', () => {
      const state = { ...initialState, listView: createDefaultListView(initialNow) };

      expect(getListCurrentPageIndex(state)).toBe(0);
    });
  });

  describe('getListCurrentPageSize()', () => {
    it('returns page size', () => {
      const state = { ...initialState, listView: createDefaultListView(initialNow) };

      expect(getListCurrentPageSize(state)).toBe(20);
    });
  });

  describe('getListErrorMessage()', () => {
    it('returns undefined when not in failed state', () => {
      const state = {
        ...initialState,
        listView: {
          currentListResourceState: createListComplexLoadingResourceState(
            createDefaultPaginationInfo(),
            200,
            initialNow
          ),
          currentPaginationInfo: createDefaultPaginationInfo(),
          freshDataTimestamp: initialNow,
        },
      };

      expect(getListErrorMessage(state)).toBeUndefined();
    });

    it('returns message when not in failed state', () => {
      const state = {
        ...initialState,
        listView: {
          currentListResourceState: createListFailedResourceState('Internal Server Error'),
          currentPaginationInfo: createDefaultPaginationInfo(),
          freshDataTimestamp: initialNow,
        },
      };

      expect(getListErrorMessage(state)).toBe('Internal Server Error');
    });
  });

  describe('isListLoading()', () => {
    it('returns false when no loading is happening', () => {
      expect(isListLoading(initialState)).toBe(false);
    });

    it('returns true when loading is in progress', () => {
      const state = {
        ...initialState,
        listView: {
          currentListResourceState: createListComplexLoadingResourceState(
            createDefaultPaginationInfo(),
            200,
            initialNow
          ),
          currentPaginationInfo: createDefaultPaginationInfo(),
          freshDataTimestamp: initialNow,
        },
      };

      expect(isListLoading(state)).toBe(true);
    });
  });

  describe('isDeletionDialogOpen()', () => {
    it('returns false when no entry is set', () => {
      expect(isDeletionDialogOpen(initialState)).toBe(false);
    });

    it('returns true when entry is set', () => {
      const state = {
        ...initialState,
        deletionDialog: {
          ...initialState.deletionDialog,
          entry: createSampleTrustedApp(5),
        },
      };

      expect(isDeletionDialogOpen(state)).toBe(true);
    });
  });

  describe('isDeletionInProgress()', () => {
    it('returns false when resource state is uninitialised', () => {
      expect(isDeletionInProgress(initialState)).toBe(false);
    });

    it('returns true when resource state is loading', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'LoadingResourceState',
        previousState: { type: 'UninitialisedResourceState' },
      });

      expect(isDeletionInProgress(state)).toBe(true);
    });

    it('returns false when resource state is loaded', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'LoadedResourceState',
        data: null,
      });

      expect(isDeletionInProgress(state)).toBe(false);
    });

    it('returns false when resource state is failed', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'FailedResourceState',
        error: createServerApiError('Not Found'),
      });

      expect(isDeletionInProgress(state)).toBe(false);
    });
  });

  describe('isDeletionSuccessful()', () => {
    it('returns false when resource state is uninitialised', () => {
      expect(isDeletionSuccessful(initialState)).toBe(false);
    });

    it('returns false when resource state is loading', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'LoadingResourceState',
        previousState: { type: 'UninitialisedResourceState' },
      });

      expect(isDeletionSuccessful(state)).toBe(false);
    });

    it('returns true when resource state is loaded', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'LoadedResourceState',
        data: null,
      });

      expect(isDeletionSuccessful(state)).toBe(true);
    });

    it('returns false when resource state is failed', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'FailedResourceState',
        error: createServerApiError('Not Found'),
      });

      expect(isDeletionSuccessful(state)).toBe(false);
    });
  });

  describe('getDeletionError()', () => {
    it('returns null when resource state is uninitialised', () => {
      expect(getDeletionError(initialState)).toBe(null);
    });

    it('returns null when resource state is loading', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'LoadingResourceState',
        previousState: { type: 'UninitialisedResourceState' },
      });

      expect(getDeletionError(state)).toBe(null);
    });

    it('returns null when resource state is loaded', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'LoadedResourceState',
        data: null,
      });

      expect(getDeletionError(state)).toBe(null);
    });

    it('returns error when resource state is failed', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'FailedResourceState',
        error: createServerApiError('Not Found'),
      });

      expect(getDeletionError(state)).toStrictEqual(createServerApiError('Not Found'));
    });
  });

  describe('getDeletionSubmissionResourceState()', () => {
    it('returns submission resource state', () => {
      expect(getDeletionSubmissionResourceState(initialState)).toStrictEqual({
        type: 'UninitialisedResourceState',
      });
    });
  });

  describe('getDeletionDialogEntry()', () => {
    it('returns null when no entry is set', () => {
      expect(getDeletionDialogEntry(initialState)).toBe(null);
    });

    it('returns entry when entry is set', () => {
      const entry = createSampleTrustedApp(5);
      const state = { ...initialState, deletionDialog: { ...initialState.deletionDialog, entry } };

      expect(isDeletionDialogOpen(state)).toStrictEqual(entry);
    });
  });
});
