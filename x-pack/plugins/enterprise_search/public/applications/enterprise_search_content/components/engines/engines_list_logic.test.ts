/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';
import { EnterpriseSearchEngine } from '../../../../../common/types/engines';

import { FetchEnginesAPILogic } from '../../api/engines/fetch_engines_api_logic';

import { EnginesListLogic } from './engines_list_logic';
import { DEFAULT_META } from './types';

const DEFAULT_VALUES = {
  createEngineFlyoutOpen: false,
  data: undefined,
  deleteModalEngine: null,
  deleteModalEngineName: '',
  deleteStatus: Status.IDLE,
  hasNoEngines: false,
  isDeleteLoading: false,
  isDeleteModalVisible: false,
  isFirstRequest: true,
  isLoading: true,
  meta: DEFAULT_META,
  parameters: { meta: DEFAULT_META },
  results: [],
  searchQuery: '',
  status: Status.IDLE,
};

// may need to call mock engines response when ready

const results: EnterpriseSearchEngine[] = [
  {
    created: '1999-12-31T23:59:59Z',
    indices: ['index-18', 'index-23'],
    name: 'engine-name-1',
    updated: '1999-12-31T23:59:59Z',
  },
  {
    created: '1999-12-31T23:59:59Z',
    indices: ['index-180', 'index-230', 'index-8', 'index-2'],
    name: 'engine-name-2',
    updated: '1999-12-31T23:59:59Z',
  },
  {
    created: '1999-12-31T23:59:59Z',
    indices: ['index-2', 'index-3'],
    name: 'engine-name-3',
    updated: '1999-12-31T23:59:59Z',
  },
];

describe('EnginesListLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(FetchEnginesAPILogic);
  const { mount } = new LogicMounter(EnginesListLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });
  it('has expected default values', () => {
    expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
  });
  describe('actions', () => {
    describe('onPaginate', () => {
      it('updates meta with newPageIndex', () => {
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);

        EnginesListLogic.actions.onPaginate({ page: { index: 1 } });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          meta: {
            ...DEFAULT_META,
            from: 10,
          },
          parameters: {
            meta: {
              ...DEFAULT_META,
              from: 10,
            },
          },
        });

        EnginesListLogic.actions.onPaginate({ page: { index: 0 } });
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);

        EnginesListLogic.actions.onPaginate({ page: { index: 3 } });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          meta: {
            ...DEFAULT_META,
            from: 30,
          },
          parameters: {
            meta: {
              ...DEFAULT_META,
              from: 30,
            },
          },
        });
      });
    });
    describe('closeDeleteEngineModal', () => {
      it('set isDeleteModalVisible to false and engineName to empty string', () => {
        EnginesListLogic.actions.openDeleteEngineModal(results[0]);
        EnginesListLogic.actions.closeDeleteEngineModal();
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
      });
    });
    describe('openDeleteEngineModal', () => {
      it('set deleteModalEngineName and set isDeleteModalVisible to true', () => {
        EnginesListLogic.actions.openDeleteEngineModal(results[0]);
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteModalEngine: results[0],
          deleteModalEngineName: 'engine-name-1',
          isDeleteModalVisible: true,
        });
      });
    });
    describe('openEngineCreate', () => {
      it('set createEngineFlyoutOpen to true', () => {
        EnginesListLogic.actions.openEngineCreate();
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          createEngineFlyoutOpen: true,
        });
      });
    });
    describe('closeEngineCreate', () => {
      it('set createEngineFlyoutOpen to false', () => {
        EnginesListLogic.actions.closeEngineCreate();
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          createEngineFlyoutOpen: false,
        });
      });
    });
    describe('setSearchQuery', () => {
      it('set setSearchQuery to search value', () => {
        EnginesListLogic.actions.setSearchQuery('my-search-query');
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          parameters: {
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
      it('updates when apiSuccess', () => {
        const newPageMeta = {
          from: 10,
          size: 20,
          total: 20,
        };
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
        EnginesListLogic.actions.apiSuccess({
          meta: newPageMeta,
          results,
          params: { from: newPageMeta.from, size: newPageMeta.size },
        });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            meta: newPageMeta,
            results,
            params: { from: newPageMeta.from, size: newPageMeta.size },
          },
          hasNoEngines: false,
          isFirstRequest: false,
          isLoading: false,
          meta: newPageMeta,
          parameters: {
            meta: newPageMeta,
          },
          results,
          status: Status.SUCCESS,
        });
      });
    });
    describe('request to delete Engine', () => {
      it('should set isDeleteLoading to true on delete engine request', () => {
        EnginesListLogic.actions.deleteEngine({ engineName: results[0].name });
        EnginesListLogic.actions.deleteError({} as HttpError);
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteStatus: Status.ERROR,
          isDeleteLoading: false,
        });
      });
      it('should set isDeleteLoading to false on delete apiError', () => {
        EnginesListLogic.actions.deleteEngine({ engineName: results[0].name });
        EnginesListLogic.actions.deleteError({} as HttpError);
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteStatus: Status.ERROR,
          isDeleteLoading: false,
        });
      });
      it('should set isDeleteLoading to false on delete apiSuccess', () => {
        EnginesListLogic.actions.deleteEngine({ engineName: results[0].name });
        EnginesListLogic.actions.deleteSuccess({ engineName: results[0].name });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteStatus: Status.SUCCESS,
          isDeleteLoading: false,
          isLoading: true,
          status: Status.LOADING, // fetchEngine api status
        });
      });
    });
    describe('isFirstRequest', () => {
      it('should update to true on setIsFirstRequest', () => {
        EnginesListLogic.actions.setIsFirstRequest();
        expect(EnginesListLogic.values).toEqual({ ...DEFAULT_VALUES, isFirstRequest: true });
      });
    });
    it('should update to false on apiError', () => {
      EnginesListLogic.actions.setIsFirstRequest();
      EnginesListLogic.actions.apiError({} as HttpError);

      expect(EnginesListLogic.values).toEqual({
        ...DEFAULT_VALUES,
        isFirstRequest: false,
        isLoading: false,
        status: Status.ERROR,
      });
    });
    it('should update to false on apiSuccess', () => {
      EnginesListLogic.actions.setIsFirstRequest();
      EnginesListLogic.actions.apiSuccess({
        meta: DEFAULT_VALUES.meta,
        results: [],
        params: {
          q: undefined,
          from: DEFAULT_VALUES.meta.from,
          size: DEFAULT_VALUES.meta.size,
        },
      });

      expect(EnginesListLogic.values).toEqual({
        ...DEFAULT_VALUES,

        meta: DEFAULT_VALUES.meta,
        data: {
          results: [],
          meta: DEFAULT_VALUES.meta,
          params: {
            q: undefined,
            from: DEFAULT_VALUES.meta.from,
            size: DEFAULT_VALUES.meta.size,
          },
        },
        hasNoEngines: true,
        isFirstRequest: false,
        isLoading: false,
        status: Status.SUCCESS,
      });
    });
  });
  describe('listeners', () => {
    it('calls flashSuccessToast, closeDeleteEngineModal and fetchEngines on deleteSuccess', () => {
      EnginesListLogic.actions.fetchEngines = jest.fn();
      EnginesListLogic.actions.closeDeleteEngineModal = jest.fn();
      EnginesListLogic.actions.deleteSuccess({ engineName: results[0].name });

      expect(mockFlashMessageHelpers.flashSuccessToast).toHaveBeenCalledTimes(1);
      expect(EnginesListLogic.actions.fetchEngines).toHaveBeenCalledWith();
      expect(EnginesListLogic.actions.closeDeleteEngineModal).toHaveBeenCalled();
    });
    it('call makeRequest on fetchEngines', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      EnginesListLogic.actions.makeRequest = jest.fn();
      EnginesListLogic.actions.fetchEngines();
      await nextTick();
      expect(EnginesListLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
      });
    });
  });
  describe('selectors', () => {
    describe('enginesList', () => {
      // response without search query parameter
      it('updates when apiSuccess with no search query', () => {
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
        EnginesListLogic.actions.apiSuccess({
          results,
          meta: DEFAULT_META,
          params: {
            q: undefined,
            from: DEFAULT_META.from,
            size: DEFAULT_META.size,
          },
        });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            results,
            meta: DEFAULT_META,
            params: {
              q: undefined,
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
          },
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          parameters: {
            meta: DEFAULT_META,
          },
          results,
          status: Status.SUCCESS,
        });
      });
      // response with search query parameter and matching result
      it('updates when apiSuccess with search query', () => {
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
        EnginesListLogic.actions.apiSuccess({
          results,
          meta: DEFAULT_META,
          params: {
            q: 'engine',
            from: DEFAULT_META.from,
            size: DEFAULT_META.size,
          },
        });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            results,
            meta: DEFAULT_META,
            params: {
              q: 'engine',
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
          },
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          parameters: {
            meta: DEFAULT_META,
          },
          results,
          status: Status.SUCCESS,
        });
      });
      // response with search query parameter and no matching result
      it('updates when apiSuccess with search query with no matching results ', () => {
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
        EnginesListLogic.actions.apiSuccess({
          results: [],
          meta: DEFAULT_META,
          params: {
            q: 'zzz',
            from: DEFAULT_META.from,
            size: DEFAULT_META.size,
          },
        });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            results: [],
            meta: DEFAULT_META,
            params: {
              q: 'zzz',
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
          },
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          parameters: {
            meta: DEFAULT_META,
          },
          results: [],
          status: Status.SUCCESS,
        });
      });
    });
    describe('hasNoEngines', () => {
      describe('no engines to list ', () => {
        // when all engines are deleted from list page, redirect to empty engine prompt
        it('updates to true when all engines are deleted  ', () => {
          expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
          EnginesListLogic.actions.apiSuccess({
            results: [],
            meta: DEFAULT_META,
            params: {
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
          });
          expect(EnginesListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              results: [],
              meta: DEFAULT_META,
              params: {
                from: DEFAULT_META.from,
                size: DEFAULT_META.size,
              },
            },
            isFirstRequest: false,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              meta: DEFAULT_META,
            },
            hasNoEngines: true,
            results: [],
            status: Status.SUCCESS,
          });
        });
        // when no engines to list, redirect to empty engine prompt
        it('updates to true when isFirstRequest is true  ', () => {
          EnginesListLogic.actions.apiSuccess({
            results: [],
            meta: DEFAULT_META,
            params: {
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
          });
          EnginesListLogic.actions.setIsFirstRequest();
          expect(EnginesListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              results: [],
              meta: DEFAULT_META,
              params: {
                from: DEFAULT_META.from,
                size: DEFAULT_META.size,
              },
            },
            isFirstRequest: true,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              meta: DEFAULT_META,
            },
            hasNoEngines: true,
            results: [],
            status: Status.SUCCESS,
          });
        });

        // when search query returns no engines, show engine list table
        it('updates to false for a search query ', () => {
          expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
          EnginesListLogic.actions.apiSuccess({
            results: [],
            meta: DEFAULT_META,
            params: {
              q: 'zzz',
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
          });
          expect(EnginesListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              results: [],
              meta: DEFAULT_META,
              params: {
                q: 'zzz',
                from: DEFAULT_META.from,
                size: DEFAULT_META.size,
              },
            },
            isFirstRequest: false,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              meta: DEFAULT_META,
            },
            results: [],
            status: Status.SUCCESS,
          });
        });
      });
      describe('with engines to list', () => {
        // when no search query, show table with list of engines
        it('updates to false without search query ', () => {
          expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
          EnginesListLogic.actions.apiSuccess({
            results,
            meta: DEFAULT_META,
            params: {
              q: undefined,
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
          });
          expect(EnginesListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              results,
              meta: DEFAULT_META,
              params: {
                q: undefined,
                from: DEFAULT_META.from,
                size: DEFAULT_META.size,
              },
            },
            isFirstRequest: false,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              meta: DEFAULT_META,
            },
            hasNoEngines: false,
            results,
            status: Status.SUCCESS,
          });
        });
        // with search query, show table with list of engines
        it('updates to false with search query ', () => {
          expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
          EnginesListLogic.actions.apiSuccess({
            results,
            meta: DEFAULT_META,
            params: {
              q: 'en',
              from: DEFAULT_META.from,
              size: DEFAULT_META.size,
            },
          });
          expect(EnginesListLogic.values).toEqual({
            ...DEFAULT_VALUES,
            data: {
              results,
              meta: DEFAULT_META,
              params: {
                q: 'en',
                from: DEFAULT_META.from,
                size: DEFAULT_META.size,
              },
            },
            isFirstRequest: false,
            isLoading: false,
            meta: DEFAULT_META,
            parameters: {
              meta: DEFAULT_META,
            },
            hasNoEngines: false,
            results,
            status: Status.SUCCESS,
          });
        });
      });
    });
  });
});
