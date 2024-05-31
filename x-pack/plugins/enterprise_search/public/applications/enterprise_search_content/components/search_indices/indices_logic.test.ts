/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { connectorIndex, elasticsearchViewIndices } from '../../__mocks__/view_index.mock';

import moment from 'moment';

import {
  ConnectorStatus,
  SyncStatus,
  IngestionStatus,
  IngestionMethod,
} from '@kbn/search-connectors';
import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';

import { FetchIndicesAPILogic } from '../../api/index/fetch_indices_api_logic';

import { IndicesLogic } from './indices_logic';

const DEFAULT_META = {
  page: {
    from: 0,
    size: 20,
    total: 20,
  },
};

const EMPTY_META = {
  page: {
    from: 0,
    size: 20,
    total: 0,
  },
};

const DEFAULT_VALUES = {
  data: undefined,
  deleteModalIndex: null,
  deleteModalIndexHasInProgressSyncs: false,
  deleteModalIndexName: '',
  deleteModalIngestionMethod: IngestionMethod.API,
  deleteStatus: Status.IDLE,
  hasNoIndices: false,
  indexDetails: undefined,
  indexDetailsStatus: 0,
  indices: [],
  isDeleteLoading: false,
  isDeleteModalVisible: false,
  isFetchIndexDetailsLoading: true,
  isFirstRequest: true,
  isLoading: true,
  meta: EMPTY_META,
  searchParams: {
    from: 0,
    onlyShowSearchOptimizedIndices: false,
    returnHiddenIndices: false,
    size: 20,
  },
  status: Status.IDLE,
};

describe('IndicesLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(FetchIndicesAPILogic);
  const { mount } = new LogicMounter(IndicesLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });

  it('has expected default values', () => {
    expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onPaginate', () => {
      it('updates meta with newPageIndex', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.onPaginate(3);
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          searchParams: {
            ...DEFAULT_VALUES.searchParams,
            from: 40,
          },
        });
      });
    });
    describe('openDeleteModal', () => {
      it('should set deleteIndexName and set isDeleteModalVisible to true', () => {
        IndicesLogic.actions.fetchIndexDetails = jest.fn();
        IndicesLogic.actions.openDeleteModal(connectorIndex.name);
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteModalIndexName: 'connector',
          isDeleteModalVisible: true,
        });
        expect(IndicesLogic.actions.fetchIndexDetails).toHaveBeenCalledWith({
          indexName: 'connector',
        });
      });
    });
    describe('closeDeleteModal', () => {
      it('should set deleteIndexName to empty and set isDeleteModalVisible to false', () => {
        IndicesLogic.actions.openDeleteModal(connectorIndex.name);
        IndicesLogic.actions.fetchIndexDetails = jest.fn();
        IndicesLogic.actions.closeDeleteModal();
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          indexDetailsStatus: Status.LOADING,
        });
      });
    });
  });
  describe('reducers', () => {
    describe('isFirstRequest', () => {
      it('should update to true on setIsFirstRequest', () => {
        IndicesLogic.actions.setIsFirstRequest();
        expect(IndicesLogic.values).toEqual({ ...DEFAULT_VALUES, isFirstRequest: true });
      });
      it('should update to false on apiError', () => {
        IndicesLogic.actions.setIsFirstRequest();
        IndicesLogic.actions.apiError({} as HttpError);

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hasNoIndices: false,
          indices: [],
          isFirstRequest: false,
          isLoading: false,
          status: Status.ERROR,
        });
      });
      it('should update to false on apiSuccess', () => {
        IndicesLogic.actions.setIsFirstRequest();
        IndicesLogic.actions.apiSuccess({
          indices: [],
          isInitialRequest: false,
          meta: DEFAULT_META,
          onlyShowSearchOptimizedIndices: false,
          returnHiddenIndices: false,
        });

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [],
            isInitialRequest: false,
            meta: DEFAULT_META,
            onlyShowSearchOptimizedIndices: false,
            returnHiddenIndices: false,
          },
          hasNoIndices: false,
          indices: [],
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
    });
    describe('hasNoIndices', () => {
      it('updates to true when apiSuccess returns initialRequest: true with no indices', () => {
        const meta = {
          page: {
            from: 0,
            size: 0,
            total: 0,
          },
        };
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [],
          isInitialRequest: true,
          meta,
          onlyShowSearchOptimizedIndices: false,
          returnHiddenIndices: false,
        });
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [],
            isInitialRequest: true,
            meta,
            onlyShowSearchOptimizedIndices: false,
            returnHiddenIndices: false,
          },
          hasNoIndices: true,
          indices: [],
          isFirstRequest: false,
          isLoading: false,
          meta,
          searchParams: {
            ...DEFAULT_VALUES.searchParams,
            from: 0,
            size: 0,
          },
          status: Status.SUCCESS,
        });
      });
      it('updates to false when apiSuccess returns initialRequest: false with no indices', () => {
        const meta = {
          page: {
            from: 0,
            size: 0,
            total: 0,
          },
        };
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [],
          isInitialRequest: false,
          meta,
          onlyShowSearchOptimizedIndices: false,
          returnHiddenIndices: false,
        });
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [],
            isInitialRequest: false,
            meta,
            onlyShowSearchOptimizedIndices: false,
            returnHiddenIndices: false,
          },
          hasNoIndices: false,
          indices: [],
          isFirstRequest: false,
          isLoading: false,
          meta,
          searchParams: {
            ...DEFAULT_VALUES.searchParams,
            from: 0,
            size: 0,
          },
          status: Status.SUCCESS,
        });
      });
    });
    describe('deleteRequest', () => {
      it('should update isDeleteLoading to true on deleteIndex', () => {
        IndicesLogic.actions.deleteIndex({ indexName: 'to-delete' });
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteStatus: Status.LOADING,
          isDeleteLoading: true,
        });
      });
      it('should update isDeleteLoading to false on apiError', () => {
        IndicesLogic.actions.deleteIndex({ indexName: 'to-delete' });
        IndicesLogic.actions.deleteError({} as HttpError);

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteStatus: Status.ERROR,
          isDeleteLoading: false,
        });
      });
      it('should update isDeleteLoading to false on apiSuccess', () => {
        IndicesLogic.actions.deleteIndex({ indexName: 'to-delete' });
        IndicesLogic.actions.deleteSuccess({ indexName: 'to-delete' });

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteStatus: Status.SUCCESS,
          isDeleteLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on new makeRequest', () => {
      IndicesLogic.actions.makeRequest({
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      });
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });
    it('calls flashSuccessToast, closeDeleteModal and fetchIndices on deleteSuccess', () => {
      IndicesLogic.actions.fetchIndices = jest.fn();
      IndicesLogic.actions.closeDeleteModal = jest.fn();
      IndicesLogic.actions.deleteSuccess({ indexName: 'index-name' });
      expect(mockFlashMessageHelpers.flashSuccessToast).toHaveBeenCalledTimes(1);
      expect(IndicesLogic.actions.fetchIndices).toHaveBeenCalledWith(
        IndicesLogic.values.searchParams
      );
      expect(IndicesLogic.actions.closeDeleteModal).toHaveBeenCalled();
    });
    it('calls makeRequest on fetchIndices', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      IndicesLogic.actions.makeRequest = jest.fn();
      IndicesLogic.actions.fetchIndices({
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      });
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledWith({
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      });
    });
    it('calls makeRequest once on two fetchIndices calls within 150ms', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      IndicesLogic.actions.makeRequest = jest.fn();
      IndicesLogic.actions.fetchIndices({
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      });
      jest.advanceTimersByTime(130);
      await nextTick();
      IndicesLogic.actions.fetchIndices({
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      });
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledWith({
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      });
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledTimes(1);
    });
    it('calls makeRequest twice on two fetchIndices calls outside 150ms', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      IndicesLogic.actions.makeRequest = jest.fn();
      IndicesLogic.actions.fetchIndices({
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      });
      jest.advanceTimersByTime(150);
      await nextTick();
      IndicesLogic.actions.fetchIndices({
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      });
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledWith({
        from: 0,
        onlyShowSearchOptimizedIndices: false,
        returnHiddenIndices: false,
        size: 20,
      });
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('selectors', () => {
    describe('indices', () => {
      it('updates when apiSuccess listener triggered', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: elasticsearchViewIndices,
          isInitialRequest: true,
          meta: DEFAULT_META,
          onlyShowSearchOptimizedIndices: false,
          returnHiddenIndices: false,
        });

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: elasticsearchViewIndices,
            isInitialRequest: true,
            meta: DEFAULT_META,
            onlyShowSearchOptimizedIndices: false,
            returnHiddenIndices: false,
          },
          hasNoIndices: false,
          indices: elasticsearchViewIndices,
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
      it('updates ingestionStatus for connector to error when last_seen is more than half an hour ago', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        const date = moment();
        const lastSeen = date.subtract(31, 'minutes').format();
        IndicesLogic.actions.apiSuccess({
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector!,
                last_seen: lastSeen,
                status: ConnectorStatus.CONNECTED,
              },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
          onlyShowSearchOptimizedIndices: false,
          returnHiddenIndices: false,
        });

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [
              {
                ...connectorIndex,
                connector: {
                  ...connectorIndex.connector!,
                  last_seen: lastSeen,
                  status: ConnectorStatus.CONNECTED,
                },
              },
            ],
            isInitialRequest: true,
            meta: DEFAULT_META,
            onlyShowSearchOptimizedIndices: false,
            returnHiddenIndices: false,
          },
          hasNoIndices: false,
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector,
                last_seen: lastSeen,
                status: ConnectorStatus.CONNECTED,
              },
              ingestionStatus: IngestionStatus.ERROR,
            },
          ],
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
      it('updates ingestionStatus for connector to connected when connected', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [
            {
              ...connectorIndex,
              connector: { ...connectorIndex.connector, status: ConnectorStatus.CONNECTED },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
          onlyShowSearchOptimizedIndices: false,
          returnHiddenIndices: false,
        });

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [
              {
                ...connectorIndex,
                connector: { ...connectorIndex.connector, status: ConnectorStatus.CONNECTED },
              },
            ],
            isInitialRequest: true,
            meta: DEFAULT_META,
            onlyShowSearchOptimizedIndices: false,
            returnHiddenIndices: false,
          },
          hasNoIndices: false,
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector,
                status: ConnectorStatus.CONNECTED,
              },
              ingestionStatus: IngestionStatus.CONNECTED,
            },
          ],
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
      it('updates ingestionStatus for connector to error when error is present', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [
            {
              ...connectorIndex,
              connector: { ...connectorIndex.connector!, status: ConnectorStatus.ERROR },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
          onlyShowSearchOptimizedIndices: false,
          returnHiddenIndices: false,
        });

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [
              {
                ...connectorIndex,
                connector: { ...connectorIndex.connector!, status: ConnectorStatus.ERROR },
              },
            ],
            isInitialRequest: true,
            meta: DEFAULT_META,
            onlyShowSearchOptimizedIndices: false,
            returnHiddenIndices: false,
          },
          hasNoIndices: false,
          indices: [
            {
              ...connectorIndex,
              connector: { ...connectorIndex.connector, status: ConnectorStatus.ERROR },
              ingestionStatus: IngestionStatus.ERROR,
            },
          ],
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
      it('updates ingestionStatus for connector to sync error when sync error is present', () => {
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector!,
                last_sync_status: SyncStatus.ERROR,
                status: ConnectorStatus.CONNECTED,
              },
            },
          ],
          isInitialRequest: true,
          meta: DEFAULT_META,
          onlyShowSearchOptimizedIndices: false,
          returnHiddenIndices: false,
        });

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [
              {
                ...connectorIndex,
                connector: {
                  ...connectorIndex.connector!,
                  last_sync_status: SyncStatus.ERROR,
                  status: ConnectorStatus.CONNECTED,
                },
              },
            ],
            isInitialRequest: true,
            meta: DEFAULT_META,
            onlyShowSearchOptimizedIndices: false,
            returnHiddenIndices: false,
          },
          hasNoIndices: false,
          indices: [
            {
              ...connectorIndex,
              connector: {
                ...connectorIndex.connector,
                last_sync_status: SyncStatus.ERROR,
                status: ConnectorStatus.CONNECTED,
              },
              ingestionStatus: IngestionStatus.SYNC_ERROR,
            },
          ],
          isFirstRequest: false,
          isLoading: false,
          meta: DEFAULT_META,
          status: Status.SUCCESS,
        });
      });
    });
  });
});
