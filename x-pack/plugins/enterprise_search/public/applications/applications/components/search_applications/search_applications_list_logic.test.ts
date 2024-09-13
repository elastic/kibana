/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';
import { EnterpriseSearchApplication } from '../../../../../common/types/search_applications';

import { FetchSearchApplicationsAPILogic } from '../../api/search_applications/fetch_search_applications_api_logic';

import { SearchApplicationsListLogic } from './search_applications_list_logic';
import { DEFAULT_META } from './types';

const DEFAULT_VALUES = {
  data: undefined,
  deleteModalSearchApplication: null,
  deleteModalSearchApplicationName: '',
  deleteStatus: Status.IDLE,
  hasNoSearchApplications: false,
  isDeleteLoading: false,
  isDeleteModalVisible: false,
  isFirstRequest: true,
  isLoading: true,
  meta: DEFAULT_META,
  parameters: { count: 0, meta: DEFAULT_META },
  results: [],
  searchQuery: '',
  status: Status.IDLE,
};
// may need to call mock search applications response when ready
const results: EnterpriseSearchApplication[] = [
  {
    indices: ['index-18', 'index-23'],
    name: 'search-application-1',
    updated_at_millis: 1679337823167,
  },
  {
    indices: ['index-180', 'index-230', 'index-8', 'index-2'],
    name: 'search-application-2',
    updated_at_millis: 1679337823167,
  },
  {
    indices: ['index-2', 'index-3'],
    name: 'search-application-3',
    updated_at_millis: 1679337823167,
  },
];
const mockData = {
  count: 3,
  params: { from: DEFAULT_META.from, size: DEFAULT_META.size },
  results,
};

describe('SearchApplicationsListLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(FetchSearchApplicationsAPILogic);
  const { mount } = new LogicMounter(SearchApplicationsListLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });
  it('has expected default values', () => {
    expect(SearchApplicationsListLogic.values).toEqual(DEFAULT_VALUES);
  });
  describe('actions', () => {
    describe('onPaginate - change page', () => {
      beforeEach(() => {
        SearchApplicationsListLogic.actions.apiSuccess({
          ...mockData,
          count: 11, // update count to simulate next page
        });
      });

      it('has search applications data', () => {
        expect(SearchApplicationsListLogic.values.data).toEqual({ ...mockData, count: 11 });
      });
      it('updates meta with newPageIndex', () => {
        jest.spyOn(SearchApplicationsListLogic.actions, 'fetchSearchApplications');
        jest.spyOn(SearchApplicationsListLogic.actions, 'onPaginate');

        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: { ...mockData, count: 11 },
          isFirstRequest: false,
          isLoading: false,
          meta: { ...DEFAULT_META, total: 11 },
          parameters: { count: 11, meta: { ...DEFAULT_META, total: 11 } },
          results: mockData.results,
          status: Status.SUCCESS,
        });

        // move to next page
        SearchApplicationsListLogic.actions.onPaginate({ page: { index: 1 } });

        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: { ...mockData, count: 11 },
          isFirstRequest: false,
          isLoading: false,
          meta: { ...DEFAULT_META, from: 10, total: 11 },
          parameters: { count: 11, meta: { ...DEFAULT_META, from: 10, total: 11 } },
          results: mockData.results,
          status: Status.SUCCESS,
        });
        // move back to previous page
        SearchApplicationsListLogic.actions.onPaginate({ page: { index: 0 } });
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: { ...mockData, count: 11 },
          isFirstRequest: false,
          isLoading: false,
          meta: { ...DEFAULT_META, total: 11 },
          parameters: { count: 11, meta: { ...DEFAULT_META, total: 11 } },
          results: mockData.results,
          status: Status.SUCCESS,
        });

        SearchApplicationsListLogic.actions.onPaginate({ page: { index: 3 } });
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: { ...mockData, count: 11 },
          isFirstRequest: false,
          isLoading: false,
          meta: { ...DEFAULT_META, from: 30, total: 11 },
          parameters: { count: 11, meta: { ...DEFAULT_META, from: 30, total: 11 } },
          results: mockData.results,
          status: Status.SUCCESS,
        });
      });
    });

    describe('closeDeleteSearchApplicationModal', () => {
      it('set isDeleteModalVisible to false and deleteModalSearchApplicationName to empty string', () => {
        SearchApplicationsListLogic.actions.openDeleteSearchApplicationModal(results[0]);
        SearchApplicationsListLogic.actions.closeDeleteSearchApplicationModal();
        expect(SearchApplicationsListLogic.values).toEqual(DEFAULT_VALUES);
      });
    });
    describe('openDeleteSearchApplicationModal', () => {
      it('set deleteModalSearchApplicationName and set isDeleteModalVisible to true', () => {
        SearchApplicationsListLogic.actions.openDeleteSearchApplicationModal(results[0]);
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteModalSearchApplication: results[0],
          deleteModalSearchApplicationName: 'search-application-1',
          isDeleteModalVisible: true,
        });
      });
    });

    describe('setSearchQuery', () => {
      it('set setSearchQuery to search value', () => {
        SearchApplicationsListLogic.actions.setSearchQuery('my-search-query');
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          parameters: {
            count: 0,
            meta: {
              ...DEFAULT_META,
            },
            searchQuery: 'my-search-query',
          },
          searchQuery: 'my-search-query',
        });
      });
    });
  });

  describe('reducers', () => {
    describe('meta', () => {
      beforeEach(() => {
        FetchSearchApplicationsAPILogic.actions.apiSuccess({
          ...mockData,
          params: { from: 10, size: 20 },
        });
      });
      it('has search applications data', () => {
        expect(SearchApplicationsListLogic.values.data).toEqual({
          ...mockData,
          params: { from: 10, size: 20 },
        });
      });
      it('updates meta with new state when apiSuccess', () => {
        jest.spyOn(SearchApplicationsListLogic.actions, 'fetchSearchApplications');
        const newCount = 20;
        const newPageMeta = {
          from: 10,
          size: 20,
          total: newCount,
        };
        FetchSearchApplicationsAPILogic.actions.apiSuccess({
          ...mockData,
          count: newCount,
          params: { from: newPageMeta.from, size: newPageMeta.size },
        });

        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            ...mockData,
            count: newCount,
            params: { from: newPageMeta.from, size: newPageMeta.size },
          },
          hasNoSearchApplications: false,
          isFirstRequest: false,
          isLoading: false,
          meta: {
            ...DEFAULT_META,
            total: newCount,
          },
          parameters: {
            count: newPageMeta.total,
            meta: {
              ...DEFAULT_META,
              total: newCount,
            },
          },
          results,
          status: Status.SUCCESS,
        });
      });
    });
    describe('request to delete Search Application', () => {
      it('should set isDeleteLoading to true on delete search application request', () => {
        SearchApplicationsListLogic.actions.deleteSearchApplication({
          searchApplicationName: results[0].name,
        });
        SearchApplicationsListLogic.actions.deleteError({} as HttpError);
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteStatus: Status.ERROR,
          isDeleteLoading: false,
        });
      });
      it('should set isDeleteLoading to false on delete apiError', () => {
        SearchApplicationsListLogic.actions.deleteSearchApplication({
          searchApplicationName: results[0].name,
        });
        SearchApplicationsListLogic.actions.deleteError({} as HttpError);
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteStatus: Status.ERROR,
          isDeleteLoading: false,
        });
      });
      it('should set isDeleteLoading to false on delete apiSuccess', () => {
        SearchApplicationsListLogic.actions.deleteSearchApplication({
          searchApplicationName: results[0].name,
        });
        SearchApplicationsListLogic.actions.deleteSuccess({
          searchApplicationName: results[0].name,
        });
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteStatus: Status.SUCCESS,
          isDeleteLoading: false,
          isLoading: true,
          status: Status.LOADING, // fetchSearchApplication api status
        });
      });
    });
    describe('isFirstRequest', () => {
      it('should update to true on setIsFirstRequest', () => {
        SearchApplicationsListLogic.actions.setIsFirstRequest();
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isFirstRequest: true,
        });
      });
    });
    it('should update to false on apiError', () => {
      SearchApplicationsListLogic.actions.setIsFirstRequest();
      SearchApplicationsListLogic.actions.apiError({} as HttpError);

      expect(SearchApplicationsListLogic.values).toEqual({
        ...DEFAULT_VALUES,
        isFirstRequest: false,
        isLoading: false,
        status: Status.ERROR,
      });
    });
    it('should update to false on apiSuccess', () => {
      SearchApplicationsListLogic.actions.setIsFirstRequest();
      SearchApplicationsListLogic.actions.apiSuccess({
        count: 0,
        params: {
          from: DEFAULT_VALUES.meta.from,
          q: undefined,
          size: DEFAULT_VALUES.meta.size,
        },
        results: [],
      });

      expect(SearchApplicationsListLogic.values).toEqual({
        ...DEFAULT_VALUES,

        data: {
          ...mockData,
          count: 0,
          params: {
            from: DEFAULT_VALUES.meta.from,
            q: undefined,
            size: DEFAULT_VALUES.meta.size,
          },
          results: [],
        },
        hasNoSearchApplications: true,
        isFirstRequest: false,
        isLoading: false,
        meta: DEFAULT_VALUES.meta,
        status: Status.SUCCESS,
      });
    });
  });
  describe('listeners', () => {
    it('calls flashSuccessToast, closeDeleteSearchApplicationModal and fetchSearchApplications on deleteSuccess', () => {
      SearchApplicationsListLogic.actions.fetchSearchApplications = jest.fn();
      SearchApplicationsListLogic.actions.closeDeleteSearchApplicationModal = jest.fn();
      SearchApplicationsListLogic.actions.deleteSuccess({ searchApplicationName: results[0].name });

      expect(mockFlashMessageHelpers.flashSuccessToast).toHaveBeenCalledTimes(1);
      expect(SearchApplicationsListLogic.actions.fetchSearchApplications).toHaveBeenCalledWith();
      expect(
        SearchApplicationsListLogic.actions.closeDeleteSearchApplicationModal
      ).toHaveBeenCalled();
    });
    it('call makeRequest on fetchSearchApplications', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      SearchApplicationsListLogic.actions.makeRequest = jest.fn();
      SearchApplicationsListLogic.actions.fetchSearchApplications();
      await nextTick();
      expect(SearchApplicationsListLogic.actions.makeRequest).toHaveBeenCalledWith({
        count: 0,
        meta: DEFAULT_META,
      });
    });
  });
  describe('selectors', () => {
    describe('data', () => {
      // response without search query parameter
      it('updates when apiSuccess with no search query', () => {
        expect(SearchApplicationsListLogic.values).toEqual(DEFAULT_VALUES);
        SearchApplicationsListLogic.actions.apiSuccess({
          count: 0,
          params: {
            from: DEFAULT_META.from,
            q: undefined,
            size: DEFAULT_META.size,
          },
          results,
        });
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            count: 0,
            params: {
              from: DEFAULT_META.from,
              q: undefined,
              size: DEFAULT_META.size,
            },
            results,
          },
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          parameters: {
            count: 0,
            meta: DEFAULT_META,
          },
          results,
          status: Status.SUCCESS,
        });
      });
      // response with search query parameter and matching result
      it('updates when apiSuccess with search query', () => {
        expect(SearchApplicationsListLogic.values).toEqual(DEFAULT_VALUES);
        SearchApplicationsListLogic.actions.apiSuccess({
          count: 0,
          params: {
            from: DEFAULT_META.from,
            q: 'application',
            size: DEFAULT_META.size,
          },
          results,
        });
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            count: 0,
            params: {
              from: DEFAULT_META.from,
              q: 'application',
              size: DEFAULT_META.size,
            },
            results,
          },
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          parameters: {
            count: 0,
            meta: DEFAULT_META,
          },
          results,
          status: Status.SUCCESS,
        });
      });
      // response with search query parameter and no matching result
      it('updates when apiSuccess with search query with no matching results ', () => {
        expect(SearchApplicationsListLogic.values).toEqual(DEFAULT_VALUES);
        SearchApplicationsListLogic.actions.apiSuccess({
          count: 0,
          params: {
            from: DEFAULT_META.from,
            q: 'zzz',
            size: DEFAULT_META.size,
          },
          results: [],
        });
        expect(SearchApplicationsListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            count: 0,
            params: {
              from: DEFAULT_META.from,
              q: 'zzz',
              size: DEFAULT_META.size,
            },
            results: [],
          },
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          parameters: {
            count: 0,
            meta: DEFAULT_META,
          },
          results: [],
          status: Status.SUCCESS,
        });
      });
    });
    describe('hasNoSearchApplications', () => {
      describe('no search applications to list ', () => {
        // when all search applications are deleted from list page, redirect to empty search application prompt
        it('updates to true when all search applications are deleted  ', () => {
          expect(SearchApplicationsListLogic.values).toEqual(DEFAULT_VALUES);
          SearchApplicationsListLogic.actions.apiSuccess({
            count: 0,
            params: {
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
            results: [],
          });
          expect(SearchApplicationsListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              ...mockData,
              count: 0,
              results: [],
            },
            hasNoSearchApplications: true,
            isFirstRequest: false,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              count: 0,
              meta: DEFAULT_META,
            },
            results: [],
            status: Status.SUCCESS,
          });
        });
        // when no search applications to list, redirect to empty search application prompt
        it('updates to true when isFirstRequest is true  ', () => {
          SearchApplicationsListLogic.actions.apiSuccess({
            count: 0,
            params: {
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
            results: [],
          });
          SearchApplicationsListLogic.actions.setIsFirstRequest();
          expect(SearchApplicationsListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              ...mockData,
              count: 0,
              results: [],
            },
            hasNoSearchApplications: true,
            isFirstRequest: true,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              count: 0,
              meta: DEFAULT_META,
            },
            results: [],
            status: Status.SUCCESS,
          });
        });

        // when search query returns no search applications, show search application list table
        it('updates to false for a search query ', () => {
          expect(SearchApplicationsListLogic.values).toEqual(DEFAULT_VALUES);
          SearchApplicationsListLogic.actions.apiSuccess({
            count: 0,
            params: {
              from: DEFAULT_META.from,
              q: 'zzz',
              size: DEFAULT_META.size,
            },
            results: [],
          });
          expect(SearchApplicationsListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              count: 0,
              params: {
                from: DEFAULT_META.from,
                q: 'zzz',
                size: DEFAULT_META.size,
              },
              results: [],
            },
            isFirstRequest: false,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              count: 0,
              meta: DEFAULT_META,
            },
            results: [],
            status: Status.SUCCESS,
          });
        });
      });
      describe('with search applications to list', () => {
        // when no search query, show table with list of search applications
        it('updates to false without search query ', () => {
          expect(SearchApplicationsListLogic.values).toEqual(DEFAULT_VALUES);
          SearchApplicationsListLogic.actions.apiSuccess({
            count: 0,
            params: {
              from: DEFAULT_META.from,
              q: undefined,
              size: DEFAULT_META.size,
            },
            results,
          });
          expect(SearchApplicationsListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              ...mockData,
              count: 0,
            },
            hasNoSearchApplications: false,
            isFirstRequest: false,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              count: 0,
              meta: DEFAULT_META,
            },
            results,
            status: Status.SUCCESS,
          });
        });
        // with search query, show table with list of search applications
        it('updates to false with search query ', () => {
          expect(SearchApplicationsListLogic.values).toEqual(DEFAULT_VALUES);
          SearchApplicationsListLogic.actions.apiSuccess({
            count: 0,
            params: {
              from: DEFAULT_META.from,
              q: 'en',
              size: DEFAULT_META.size,
            },
            results,
          });
          expect(SearchApplicationsListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              count: 0,
              params: {
                from: DEFAULT_META.from,
                q: 'en',
                size: DEFAULT_META.size,
              },
              results,
            },
            hasNoSearchApplications: false,
            isFirstRequest: false,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              count: 0,
              meta: DEFAULT_META,
            },
            results,
            status: Status.SUCCESS,
          });
        });
      });
    });
  });
});
