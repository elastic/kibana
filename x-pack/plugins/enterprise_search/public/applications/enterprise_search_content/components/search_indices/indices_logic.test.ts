/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { indices } from '../../__mocks__/search_indices.mock';

import { connectorIndex, elasticsearchViewIndices } from '../../__mocks__/view_index.mock';

import moment from 'moment';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';

import { ConnectorStatus, SyncStatus } from '../../../../../common/types/connectors';
import { DEFAULT_META } from '../../../shared/constants';

import { FetchIndicesAPILogic } from '../../api/index/fetch_indices_api_logic';

import { IngestionMethod, IngestionStatus } from '../../types';

import { IndicesLogic } from './indices_logic';

const DEFAULT_VALUES = {
  data: undefined,
  deleteModalIndex: null,
  deleteModalIndexName: '',
  deleteModalIngestionMethod: IngestionMethod.API,
  deleteStatus: Status.IDLE,
  hasNoIndices: false,
  indices: [],
  isDeleteLoading: false,
  isDeleteModalVisible: false,
  isFirstRequest: true,
  isLoading: true,
  meta: DEFAULT_META,
  searchParams: { meta: DEFAULT_META, returnHiddenIndices: false },
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
          meta: {
            page: {
              ...DEFAULT_META.page,
              current: 3,
            },
          },
          searchParams: {
            ...DEFAULT_VALUES.searchParams,
            meta: { page: { ...DEFAULT_META.page, current: 3 } },
          },
        });
      });
    });
    describe('openDeleteModal', () => {
      it('should set deleteIndexName and set isDeleteModalVisible to true', () => {
        IndicesLogic.actions.openDeleteModal(connectorIndex);
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          deleteModalIndex: connectorIndex,
          deleteModalIndexName: 'connector',
          deleteModalIngestionMethod: IngestionMethod.CONNECTOR,
          isDeleteModalVisible: true,
        });
      });
    });
    describe('closeDeleteModal', () => {
      it('should set deleteIndexName to empty and set isDeleteModalVisible to false', () => {
        IndicesLogic.actions.openDeleteModal(connectorIndex);
        IndicesLogic.actions.closeDeleteModal();
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
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
          meta: DEFAULT_VALUES.meta,
          returnHiddenIndices: false,
        });

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [],
            isInitialRequest: false,
            meta: DEFAULT_VALUES.meta,
            returnHiddenIndices: false,
          },
          hasNoIndices: false,
          indices: [],
          isFirstRequest: false,
          isLoading: false,
          status: Status.SUCCESS,
        });
      });
    });
    describe('meta', () => {
      it('updates when apiSuccess listener triggered', () => {
        const newMeta = {
          page: {
            current: 2,
            size: 5,
            total_pages: 10,
            total_results: 52,
          },
        };
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices,
          isInitialRequest: true,
          meta: newMeta,
          returnHiddenIndices: true,
          searchQuery: 'a',
        });
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices,
            isInitialRequest: true,
            meta: newMeta,
            returnHiddenIndices: true,
            searchQuery: 'a',
          },
          hasNoIndices: false,
          indices: elasticsearchViewIndices,
          isFirstRequest: false,
          isLoading: false,
          meta: newMeta,
          searchParams: {
            meta: newMeta,
            returnHiddenIndices: true,
            searchQuery: 'a',
          },
          status: Status.SUCCESS,
        });
      });
    });
    describe('hasNoIndices', () => {
      it('updates to true when apiSuccess returns initialRequest: true with no indices', () => {
        const meta = {
          page: {
            current: 1,
            size: 0,
            total_pages: 1,
            total_results: 0,
          },
        };
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [],
          isInitialRequest: true,
          meta,
          returnHiddenIndices: false,
        });
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [],
            isInitialRequest: true,
            meta,
            returnHiddenIndices: false,
          },
          hasNoIndices: true,
          indices: [],
          isFirstRequest: false,
          isLoading: false,
          meta,
          searchParams: {
            ...DEFAULT_VALUES.searchParams,
            meta,
          },
          status: Status.SUCCESS,
        });
      });
      it('updates to false when apiSuccess returns initialRequest: false with no indices', () => {
        const meta = {
          page: {
            current: 1,
            size: 0,
            total_pages: 1,
            total_results: 0,
          },
        };
        expect(IndicesLogic.values).toEqual(DEFAULT_VALUES);
        IndicesLogic.actions.apiSuccess({
          indices: [],
          isInitialRequest: false,
          meta,
          returnHiddenIndices: false,
        });
        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: [],
            isInitialRequest: false,
            meta,
            returnHiddenIndices: false,
          },
          hasNoIndices: false,
          indices: [],
          isFirstRequest: false,
          isLoading: false,
          meta,
          searchParams: {
            ...DEFAULT_VALUES.searchParams,
            meta,
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
      IndicesLogic.actions.makeRequest({ meta: DEFAULT_META, returnHiddenIndices: false });
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
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
        returnHiddenIndices: false,
      });
    });
    it('calls makeRequest once on two fetchIndices calls within 150ms', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      IndicesLogic.actions.makeRequest = jest.fn();
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(130);
      await nextTick();
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
        returnHiddenIndices: false,
      });
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledTimes(1);
    });
    it('calls makeRequest twice on two fetchIndices calls outside 150ms', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      IndicesLogic.actions.makeRequest = jest.fn();
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(150);
      await nextTick();
      IndicesLogic.actions.fetchIndices({ meta: DEFAULT_META, returnHiddenIndices: false });
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(IndicesLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
        returnHiddenIndices: false,
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
          returnHiddenIndices: false,
        });

        expect(IndicesLogic.values).toEqual({
          ...DEFAULT_VALUES,
          data: {
            indices: elasticsearchViewIndices,
            isInitialRequest: true,
            meta: DEFAULT_META,
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
