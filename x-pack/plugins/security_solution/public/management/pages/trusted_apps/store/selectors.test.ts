/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AsyncResourceState,
  TrustedAppsListPageLocation,
  TrustedAppsListPageState,
} from '../state';
import { initialTrustedAppsPageState } from './builders';
import {
  getListResourceState,
  getLastLoadedListResourceState,
  getCurrentLocationPageIndex,
  getCurrentLocationPageSize,
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
  createDefaultPagination,
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
      const listView = createLoadedListViewWithPagination(initialNow, { pageIndex: 1 });

      expect(needsRefreshOfListData({ ...initialState, listView, active: true })).toBe(true);
    });

    it('returns true when current loaded page size is outdated', () => {
      const listView = createLoadedListViewWithPagination(initialNow, { pageSize: 50 });

      expect(needsRefreshOfListData({ ...initialState, listView, active: true })).toBe(true);
    });

    it('returns true when current loaded data timestamp is outdated', () => {
      const listView = {
        ...createLoadedListViewWithPagination(111111),
        freshDataTimestamp: 222222,
      };

      expect(needsRefreshOfListData({ ...initialState, listView, active: true })).toBe(true);
    });

    it('returns false when current loaded data is up to date', () => {
      const listView = createLoadedListViewWithPagination(initialNow);
      const location: TrustedAppsListPageLocation = {
        page_index: 0,
        page_size: 10,
        view_type: 'grid',
        filter: '',
        included_policies: '',
      };

      expect(needsRefreshOfListData({ ...initialState, listView, active: true, location })).toBe(
        false
      );
    });
  });

  describe('getListResourceState()', () => {
    it('returns current list resource state', () => {
      expect(getListResourceState(initialState)).toStrictEqual(createUninitialisedResourceState());
    });
  });

  describe('getLastLoadedListResourceState()', () => {
    it('returns last loaded list resource state', () => {
      const state = {
        ...initialState,
        listView: {
          listResourceState: createListComplexLoadingResourceState(
            createDefaultPagination(),
            initialNow
          ),
          freshDataTimestamp: initialNow,
        },
      };

      expect(getLastLoadedListResourceState(state)).toStrictEqual(
        createListLoadedResourceState(createDefaultPagination(), initialNow)
      );
    });
  });

  describe('getListItems()', () => {
    it('returns empty list when no valid data loaded', () => {
      expect(getListItems(initialState)).toStrictEqual([]);
    });

    it('returns last loaded list items', () => {
      const state = {
        ...initialState,
        listView: {
          listResourceState: createListComplexLoadingResourceState(
            createDefaultPagination(),
            initialNow
          ),
          freshDataTimestamp: initialNow,
        },
      };

      expect(getListItems(state)).toStrictEqual(createSampleTrustedApps(createDefaultPagination()));
    });
  });

  describe('getListTotalItemsCount()', () => {
    it('returns 0 when no valid data loaded', () => {
      expect(getListTotalItemsCount(initialState)).toBe(0);
    });

    it('returns last loaded total items count', () => {
      const state = {
        ...initialState,
        listView: {
          listResourceState: createListComplexLoadingResourceState(
            createDefaultPagination(),
            initialNow
          ),
          freshDataTimestamp: initialNow,
        },
      };

      expect(getListTotalItemsCount(state)).toBe(200);
    });
  });

  describe('getListCurrentPageIndex()', () => {
    it('returns page index', () => {
      const location: TrustedAppsListPageLocation = {
        page_index: 3,
        page_size: 10,
        view_type: 'grid',
        filter: '',
        included_policies: '',
      };

      expect(getCurrentLocationPageIndex({ ...initialState, location })).toBe(3);
    });
  });

  describe('getListCurrentPageSize()', () => {
    it('returns page size', () => {
      const location: TrustedAppsListPageLocation = {
        page_index: 0,
        page_size: 20,
        view_type: 'grid',
        filter: '',
        included_policies: '',
      };

      expect(getCurrentLocationPageSize({ ...initialState, location })).toBe(20);
    });
  });

  describe('getListErrorMessage()', () => {
    it('returns undefined when not in failed state', () => {
      const state = {
        ...initialState,
        listView: {
          listResourceState: createListComplexLoadingResourceState(
            createDefaultPagination(),
            initialNow
          ),
          freshDataTimestamp: initialNow,
        },
      };

      expect(getListErrorMessage(state)).toBeUndefined();
    });

    it('returns message when not in failed state', () => {
      const state = {
        ...initialState,
        listView: {
          listResourceState: createListFailedResourceState('Internal Server Error'),
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
          listResourceState: createListComplexLoadingResourceState(
            createDefaultPagination(),
            initialNow
          ),
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
    it('returns undefined when resource state is uninitialised', () => {
      expect(getDeletionError(initialState)).toBeUndefined();
    });

    it('returns undefined when resource state is loading', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'LoadingResourceState',
        previousState: { type: 'UninitialisedResourceState' },
      });

      expect(getDeletionError(state)).toBeUndefined();
    });

    it('returns undefined when resource state is loaded', () => {
      const state = createStateWithDeletionSubmissionResourceState({
        type: 'LoadedResourceState',
        data: null,
      });

      expect(getDeletionError(state)).toBeUndefined();
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
    it('returns undefined when no entry is set', () => {
      expect(getDeletionDialogEntry(initialState)).toBeUndefined();
    });

    it('returns entry when entry is set', () => {
      const entry = createSampleTrustedApp(5);
      const state = { ...initialState, deletionDialog: { ...initialState.deletionDialog, entry } };

      expect(getDeletionDialogEntry(state)).toStrictEqual(entry);
    });
  });
});
