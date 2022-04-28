/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialEventFiltersPageState } from './builders';
import {
  getFormEntry,
  getFormHasError,
  getCurrentLocation,
  getNewComment,
  getHasNameError,
  getCurrentListPageState,
  getListPageIsActive,
  getCurrentListPageDataState,
  getListApiSuccessResponse,
  getListItems,
  getTotalCountListItems,
  getCurrentListItemsQuery,
  getListPagination,
  getListFetchError,
  getListIsLoading,
  getListPageDoesDataExist,
  listDataNeedsRefresh,
} from './selector';
import { ecsEventMock } from '../test_utils';
import { getInitialExceptionFromEvent } from './utils';
import { EventFiltersListPageState, EventFiltersPageLocation } from '../types';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../../common/constants';
import { getFoundExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/found_exception_list_item_schema.mock';
import {
  asStaleResourceState,
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
  createUninitialisedResourceState,
  getLastLoadedResourceState,
} from '../../../state';

describe('event filters selectors', () => {
  let initialState: EventFiltersListPageState;

  // When `setToLoadingState()` is called, this variable will hold the prevousState in order to
  // avoid ts-ignores due to know issues (#830) around the LoadingResourceState
  let previousStateWhileLoading: EventFiltersListPageState['listPage']['data'] | undefined;

  const setToLoadedState = () => {
    initialState.listPage.data = createLoadedResourceState({
      query: { page: 2, perPage: 10, filter: '' },
      content: getFoundExceptionListItemSchemaMock(),
    });
  };

  const setToLoadingState = (
    previousState: EventFiltersListPageState['listPage']['data'] = createLoadedResourceState({
      query: { page: 5, perPage: 50, filter: '' },
      content: getFoundExceptionListItemSchemaMock(),
    })
  ) => {
    previousStateWhileLoading = previousState;

    initialState.listPage.data = createLoadingResourceState(asStaleResourceState(previousState));
  };

  beforeEach(() => {
    initialState = initialEventFiltersPageState();
  });

  describe('getCurrentListPageState()', () => {
    it('should retrieve list page state', () => {
      expect(getCurrentListPageState(initialState)).toEqual(initialState.listPage);
    });
  });

  describe('getListPageIsActive()', () => {
    it('should return active state', () => {
      expect(getListPageIsActive(initialState)).toBe(false);
    });
  });

  describe('getCurrentListPageDataState()', () => {
    it('should return list data state', () => {
      expect(getCurrentListPageDataState(initialState)).toEqual(initialState.listPage.data);
    });
  });

  describe('getListApiSuccessResponse()', () => {
    it('should return api response', () => {
      setToLoadedState();
      expect(getListApiSuccessResponse(initialState)).toEqual(
        getLastLoadedResourceState(initialState.listPage.data)?.data.content
      );
    });

    it('should return undefined if not available', () => {
      setToLoadingState(createUninitialisedResourceState());
      expect(getListApiSuccessResponse(initialState)).toBeUndefined();
    });

    it('should return previous success response if currently loading', () => {
      setToLoadingState();
      expect(getListApiSuccessResponse(initialState)).toEqual(
        getLastLoadedResourceState(previousStateWhileLoading!)?.data.content
      );
    });
  });

  describe('getListItems()', () => {
    it('should return the list items from api response', () => {
      setToLoadedState();
      expect(getListItems(initialState)).toEqual(
        getLastLoadedResourceState(initialState.listPage.data)?.data.content.data
      );
    });

    it('should return empty array if no api response', () => {
      expect(getListItems(initialState)).toEqual([]);
    });
  });

  describe('getTotalCountListItems()', () => {
    it('should return the list items from api response', () => {
      setToLoadedState();
      expect(getTotalCountListItems(initialState)).toEqual(
        getLastLoadedResourceState(initialState.listPage.data)?.data.content.total
      );
    });

    it('should return empty array if no api response', () => {
      expect(getTotalCountListItems(initialState)).toEqual(0);
    });
  });

  describe('getCurrentListItemsQuery()', () => {
    it('should return empty object if Uninitialized', () => {
      expect(getCurrentListItemsQuery(initialState)).toEqual({});
    });

    it('should return query from current loaded state', () => {
      setToLoadedState();
      expect(getCurrentListItemsQuery(initialState)).toEqual({ page: 2, perPage: 10, filter: '' });
    });

    it('should return query from previous state while Loading new page', () => {
      setToLoadingState();
      expect(getCurrentListItemsQuery(initialState)).toEqual({ page: 5, perPage: 50, filter: '' });
    });
  });

  describe('getListPagination()', () => {
    it('should return pagination defaults if no API response is available', () => {
      expect(getListPagination(initialState)).toEqual({
        totalItemCount: 0,
        pageSize: 10,
        pageSizeOptions: [10, 20, 50],
        pageIndex: 0,
      });
    });

    it('should return pagination based on API response', () => {
      setToLoadedState();
      expect(getListPagination(initialState)).toEqual({
        totalItemCount: 1,
        pageSize: 1,
        pageSizeOptions: [10, 20, 50],
        pageIndex: 0,
      });
    });
  });

  describe('getListFetchError()', () => {
    it('should return undefined if no error exists', () => {
      expect(getListFetchError(initialState)).toBeUndefined();
    });

    it('should return the API error', () => {
      const error = {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Something is not right',
      };

      initialState.listPage.data = createFailedResourceState(error);
      expect(getListFetchError(initialState)).toBe(error);
    });
  });

  describe('getListIsLoading()', () => {
    it('should return false if not in a Loading state', () => {
      expect(getListIsLoading(initialState)).toBe(false);
    });

    it('should return true if in a Loading state', () => {
      setToLoadingState();
      expect(getListIsLoading(initialState)).toBe(true);
    });
  });

  describe('getListPageDoesDataExist()', () => {
    it('should return false (default) until we get a Loaded Resource state', () => {
      expect(getListPageDoesDataExist(initialState)).toBe(false);

      // Set DataExists to Loading
      initialState.listPage.dataExist = createLoadingResourceState(
        asStaleResourceState(initialState.listPage.dataExist)
      );
      expect(getListPageDoesDataExist(initialState)).toBe(false);

      // Set DataExists to Failure
      initialState.listPage.dataExist = createFailedResourceState({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Something is not right',
      });
      expect(getListPageDoesDataExist(initialState)).toBe(false);
    });

    it('should return false if no data exists', () => {
      initialState.listPage.dataExist = createLoadedResourceState(false);
      expect(getListPageDoesDataExist(initialState)).toBe(false);
    });
  });

  describe('listDataNeedsRefresh()', () => {
    beforeEach(() => {
      setToLoadedState();

      initialState.location = {
        page_index: 1,
        page_size: 10,
        filter: '',
        id: '',
        show: undefined,
        included_policies: '',
      };
    });

    it('should return false if location url params match those that were used in api call', () => {
      expect(listDataNeedsRefresh(initialState)).toBe(false);
    });

    it('should return true if `forceRefresh` is set', () => {
      initialState.listPage.forceRefresh = true;
      expect(listDataNeedsRefresh(initialState)).toBe(true);
    });

    it('should should return true if any of the url params differ from last api call', () => {
      initialState.location.page_index = 10;
      expect(listDataNeedsRefresh(initialState)).toBe(true);
    });
  });

  describe('getFormEntry()', () => {
    it('returns undefined when there is no entry', () => {
      expect(getFormEntry(initialState)).toBe(undefined);
    });
    it('returns entry when there is an entry on form', () => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          entry,
        },
      };
      expect(getFormEntry(state)).toBe(entry);
    });
  });
  describe('getHasNameError()', () => {
    it('returns false when there is no entry', () => {
      expect(getHasNameError(initialState)).toBeFalsy();
    });
    it('returns true when entry with name error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasNameError: true,
        },
      };
      expect(getHasNameError(state)).toBeTruthy();
    });
    it('returns false when entry with no name error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasNameError: false,
        },
      };
      expect(getHasNameError(state)).toBeFalsy();
    });
  });
  describe('getFormHasError()', () => {
    it('returns false when there is no entry', () => {
      expect(getFormHasError(initialState)).toBeFalsy();
    });
    it('returns true when entry with name error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasNameError: true,
        },
      };
      expect(getFormHasError(state)).toBeTruthy();
    });
    it('returns true when entry with item error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasItemsError: true,
        },
      };
      expect(getFormHasError(state)).toBeTruthy();
    });
    it('returns true when entry with os error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasOSError: true,
        },
      };
      expect(getFormHasError(state)).toBeTruthy();
    });
    it('returns true when entry with item error, name error and os error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasItemsError: true,
          hasNameError: true,
          hasOSError: true,
        },
      };
      expect(getFormHasError(state)).toBeTruthy();
    });

    it('returns false when entry without errors', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasItemsError: false,
          hasNameError: false,
          hasOSError: false,
        },
      };
      expect(getFormHasError(state)).toBeFalsy();
    });
  });
  describe('getCurrentLocation()', () => {
    it('returns current locations', () => {
      const expectedLocation: EventFiltersPageLocation = {
        show: 'create',
        page_index: MANAGEMENT_DEFAULT_PAGE,
        page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
        filter: 'filter',
        included_policies: '1',
      };
      const state = {
        ...initialState,
        location: expectedLocation,
      };
      expect(getCurrentLocation(state)).toBe(expectedLocation);
    });
  });
  describe('getNewComment()', () => {
    it('returns new comment', () => {
      const newComment = 'this is a new comment';
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          newComment,
        },
      };
      expect(getNewComment(state)).toBe(newComment);
    });
    it('returns empty comment', () => {
      const state = {
        ...initialState,
      };
      expect(getNewComment(state)).toBe('');
    });
  });
});
