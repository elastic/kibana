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
  getCurrentListPageState,
  getListPageIsActive,
  getCurrentListPageDataState,
  getListApiSuccessResponse,
  getListItems,
} from './selector';
import { ecsEventMock } from '../test_utils';
import { getInitialExceptionFromEvent } from './utils';
import { EventFiltersListPageState, EventFiltersPageLocation } from '../state';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../../common/constants';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import {
  createLoadedResourceState,
  createLoadingResourceState,
  createUninitialisedResourceState,
  getLastLoadedResourceState,
  LoadedResourceState,
} from '../../../state';

describe('event filters selectors', () => {
  let initialState: EventFiltersListPageState;

  // When `setToLoadingState()` is called, this variable will hold the prevousState in order to
  // avoid ts-ignores due to know issues (#830) around the LoadingResourceState
  let previousStateWhileLoading: EventFiltersListPageState['listPage']['data'] | undefined;

  const setToLoadedState = () => {
    initialState.listPage.data = createLoadedResourceState({
      query: { page: 2, perPage: 10 },
      content: getFoundExceptionListItemSchemaMock(),
    });
  };

  const setToLoadingState = (
    previousState: EventFiltersListPageState['listPage']['data'] = createLoadedResourceState({
      query: {},
      content: getFoundExceptionListItemSchemaMock(),
    })
  ) => {
    previousStateWhileLoading = previousState;

    // will be fixed when AsyncResourceState is refactored (#830)
    // @ts-ignore
    initialState.listPage.data = createLoadingResourceState(previousState);
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

      initialState.listPage.active = true;
      expect(getListPageIsActive(initialState)).toBe(true);
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
      expect(getListApiSuccessResponse(initialState)).toEqual(initialState.listPage.data);
    });

    it('should return undefined if not available', () => {
      setToLoadingState(createUninitialisedResourceState());
      expect(getListApiSuccessResponse(initialState)).toBeUndefined();
    });

    it('should return previous success response if currently loading', () => {
      setToLoadingState();
      expect(getListApiSuccessResponse(initialState)).toEqual(
        getLastLoadedResourceState(previousStateWhileLoading!)?.data
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

    it.todo('should return empty array if no api response');
  });

  describe('getCurrentListItemsQuery()', () => {});

  describe('getListPagination()', () => {});

  describe('getListFetchError()', () => {});

  describe('getListIsLoading()', () => {});

  describe('getListPageDataExistsState()', () => {});

  describe('getListPageDataExist()', () => {});

  describe('listdataNeedsRefresh()', () => {});

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
      };
      const state = {
        ...initialState,
        location: expectedLocation,
      };
      expect(getCurrentLocation(state)).toBe(expectedLocation);
    });
  });
});
