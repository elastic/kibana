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
  data: undefined,
  deleteModalEngine: null,
  deleteModalEngineName: '',
  deleteStatus: Status.IDLE,
  isDeleteLoading: false,
  isDeleteModalVisible: false,
  isLoading: true,
  meta: DEFAULT_META,
  parameters: { meta: DEFAULT_META },
  results: [],
  status: Status.IDLE,
};

// may need to call  mock engines response when ready

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
  });

  describe('reducers', () => {
    describe('meta', () => {
      it('updates when apiSuccess', () => {
        const newPageMeta = {
          from: 2,
          size: 3,
          total: 6,
        };
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
        EnginesListLogic.actions.apiSuccess({
          meta: newPageMeta,
          results,
          // searchQuery: 'k',
        });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            results,
            meta: newPageMeta,
            // searchQuery: 'k',
          },
          isLoading: false,
          meta: newPageMeta,
          parameters: {
            meta: newPageMeta,
            // searchQuery: 'k',
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
  });
  describe('listeners', () => {
    it('calls flashSuccessToast, closeDeleteEngineModal and fetchEngines on deleteSuccess', () => {
      EnginesListLogic.actions.fetchEngines = jest.fn();
      EnginesListLogic.actions.closeDeleteEngineModal = jest.fn();
      EnginesListLogic.actions.deleteSuccess({ engineName: results[0].name });

      expect(mockFlashMessageHelpers.flashSuccessToast).toHaveBeenCalledTimes(1);
      expect(EnginesListLogic.actions.fetchEngines).toHaveBeenCalledWith(
        EnginesListLogic.values.parameters
      );
      expect(EnginesListLogic.actions.closeDeleteEngineModal).toHaveBeenCalled();
    });
    it('call makeRequest on fetchEngines', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      EnginesListLogic.actions.makeRequest = jest.fn();
      EnginesListLogic.actions.fetchEngines({ meta: DEFAULT_META });
      await nextTick();
      expect(EnginesListLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
      });
    });
  });
  describe('selectors', () => {
    describe('enginesList', () => {
      it('updates when apiSuccess', () => {
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
        EnginesListLogic.actions.apiSuccess({
          results,
          meta: DEFAULT_META,
        });
        expect(EnginesListLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            results,
            meta: DEFAULT_META,
          },
          isLoading: false,
          meta: DEFAULT_META,
          parameters: {
            meta: DEFAULT_META,
          },
          results,
          status: Status.SUCCESS,
        });
      });
    });
  });
});
