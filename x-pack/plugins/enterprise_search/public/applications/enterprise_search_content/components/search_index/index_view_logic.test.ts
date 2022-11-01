/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';
import { apiIndex, connectorIndex, crawlerIndex } from '../../__mocks__/view_index.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';

import { SyncStatus } from '../../../../../common/types/connectors';
import { StartSyncApiLogic } from '../../api/connector/start_sync_api_logic';
import { FetchIndexApiWrapperLogic } from '../../api/index/fetch_index_wrapper.logic';

import { IngestionMethod, IngestionStatus } from '../../types';

import { indexToViewIndex } from '../../utils/indices';

import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';

// We can't test fetchTimeOutId because this will get set whenever the logic is created
// And the timeoutId is non-deterministic. We use expect.object.containing throughout this test file
const DEFAULT_VALUES = {
  connectorId: null,
  data: undefined,
  fetchIndexApiStatus: Status.SUCCESS,
  indexData: { index: { ingestionMethod: 'api', ingestionStatus: 0, lastUpdated: null } },
  indexName: '',
  ingestionMethod: IngestionMethod.API,
  ingestionStatus: IngestionStatus.CONNECTED,
  isSyncing: false,
  isWaitingForSync: false,
  lastUpdated: null,
  localSyncNowValue: false,
  recheckIndexLoading: false,
  syncStatus: null,
};

const CONNECTOR_VALUES = {
  ...DEFAULT_VALUES,
  connectorId: connectorIndex.connector.id,
  data: connectorIndex,
  indexData: { index: indexToViewIndex(connectorIndex) },
  ingestionMethod: IngestionMethod.CONNECTOR,
  ingestionStatus: IngestionStatus.INCOMPLETE,
  lastUpdated: 'never',
};

describe('IndexViewLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(StartSyncApiLogic);
  const { mount: fetchIndexMount } = new LogicMounter(FetchIndexApiWrapperLogic);
  const indexNameLogic = new LogicMounter(IndexNameLogic);
  const { mount } = new LogicMounter(IndexViewLogic);
  const { flashSuccessToast } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    indexNameLogic.mount({ indexName: 'index-name' }, { indexName: 'index-name' });
    apiLogicMount();
    fetchIndexMount();
    mount();
  });

  it('has expected default values', () => {
    expect(IndexViewLogic.values).toEqual(expect.objectContaining(DEFAULT_VALUES));
  });

  describe('actions', () => {
    describe('FetchIndexApiWrapperLogic.apiSuccess', () => {
      beforeEach(() => {
        IndexViewLogic.actions.createNewFetchIndexTimeout = jest.fn();
      });

      it('should update values', () => {
        FetchIndexApiWrapperLogic.actions.apiSuccess({
          ...connectorIndex,
          connector: { ...connectorIndex.connector!, sync_now: true },
        });

        expect(IndexViewLogic.values).toEqual(
          expect.objectContaining({
            ...CONNECTOR_VALUES,
            data: {
              ...CONNECTOR_VALUES.data,
              connector: { ...CONNECTOR_VALUES.data.connector, sync_now: true },
            },
            indexData: {
              index: {
                ...CONNECTOR_VALUES.indexData.index,
                connector: { ...CONNECTOR_VALUES.indexData.index.connector, sync_now: true },
              },
            },
            isWaitingForSync: true,
            localSyncNowValue: true,
            syncStatus: SyncStatus.COMPLETED,
          })
        );
      });

      it('should update values with no connector', () => {
        FetchIndexApiWrapperLogic.actions.apiSuccess(apiIndex);

        expect(IndexViewLogic.values).toEqual(
          expect.objectContaining({
            ...DEFAULT_VALUES,
            data: apiIndex,
            indexData: {
              index: apiIndex,
            },
          })
        );
      });

      it('should call createNewFetchIndexTimeout', () => {
        IndexViewLogic.actions.fetchCrawlerData = jest.fn();
        IndexNameLogic.actions.setIndexName('api');
        FetchIndexApiWrapperLogic.actions.apiSuccess(apiIndex);

        expect(IndexViewLogic.actions.createNewFetchIndexTimeout).toHaveBeenCalled();
        expect(IndexViewLogic.actions.fetchCrawlerData).not.toHaveBeenCalled();
      });
      it('should call fetchCrawler if index is a crawler ', () => {
        IndexViewLogic.actions.fetchCrawlerData = jest.fn();
        IndexNameLogic.actions.setIndexName('crawler');
        FetchIndexApiWrapperLogic.actions.apiSuccess(crawlerIndex);

        expect(IndexViewLogic.actions.createNewFetchIndexTimeout).toHaveBeenCalled();
        expect(IndexViewLogic.actions.fetchCrawlerData).toHaveBeenCalled();
      });
      it('should not call fetchCrawler if index is a crawler but indexName does not match', () => {
        IndexViewLogic.actions.fetchCrawlerData = jest.fn();
        IndexNameLogic.actions.setIndexName('api');
        FetchIndexApiWrapperLogic.actions.apiSuccess(crawlerIndex);

        expect(IndexViewLogic.actions.createNewFetchIndexTimeout).toHaveBeenCalled();
        expect(IndexViewLogic.actions.fetchCrawlerData).not.toHaveBeenCalled();
      });
      it('should flash success if recheckFetchIndexLoading', () => {
        IndexViewLogic.actions.resetRecheckIndexLoading = jest.fn();
        IndexNameLogic.actions.setIndexName('api');
        IndexViewLogic.actions.recheckIndex();
        FetchIndexApiWrapperLogic.actions.apiSuccess(apiIndex);

        expect(IndexViewLogic.actions.createNewFetchIndexTimeout).toHaveBeenCalled();
        expect(flashSuccessToast).toHaveBeenCalled();
      });
    });

    describe('fetchIndex.apiError', () => {
      beforeEach(() => {
        IndexViewLogic.actions.createNewFetchIndexTimeout = jest.fn();
      });

      it('should call createNewFetchIndexTimeout', () => {
        FetchIndexApiWrapperLogic.actions.apiError({} as HttpError);

        expect(IndexViewLogic.actions.createNewFetchIndexTimeout).toHaveBeenCalled();
      });
    });

    describe('startSync', () => {
      it('should call makeStartSyncRequest', async () => {
        // TODO: replace with mounting connectorIndex to FetchIndexApiDirectly to avoid
        // needing to mock out actions unrelated to test called by listeners
        IndexViewLogic.actions.createNewFetchIndexTimeout = jest.fn();
        FetchIndexApiWrapperLogic.actions.apiSuccess(connectorIndex);
        IndexViewLogic.actions.makeStartSyncRequest = jest.fn();

        IndexViewLogic.actions.startSync();
        await nextTick();

        expect(IndexViewLogic.actions.makeStartSyncRequest).toHaveBeenCalledWith({
          connectorId: '2',
        });
      });
    });

    describe('StartSyncApiLogic.apiSuccess', () => {
      it('should set localSyncNow to true', async () => {
        mount({
          localSyncNowValue: false,
        });
        StartSyncApiLogic.actions.apiSuccess({});

        expect(IndexViewLogic.values.localSyncNowValue).toEqual(true);
      });
    });
  });

  describe('clearTimeoutId', () => {
    it('should clear timeout Id', () => {
      IndexViewLogic.actions.startFetchIndexPoll();
      expect(IndexViewLogic.values.fetchIndexTimeoutId).not.toEqual(null);
      IndexViewLogic.actions.clearFetchIndexTimeout();
      expect(IndexViewLogic.values.fetchIndexTimeoutId).toEqual(null);
    });
  });
  describe('createNewFetchIndexTimeout', () => {
    it('should trigger fetchIndex after timeout', async () => {
      IndexViewLogic.actions.fetchIndex = jest.fn();
      jest.useFakeTimers('legacy');
      IndexViewLogic.actions.createNewFetchIndexTimeout(1);
      expect(IndexViewLogic.actions.fetchIndex).not.toHaveBeenCalled();
      jest.advanceTimersByTime(2);
      await nextTick();
      expect(IndexViewLogic.actions.fetchIndex).toHaveBeenCalled();
    });
  });

  describe('recheckIndexLoading', () => {
    it('should be set to true on recheckIndex', () => {
      IndexViewLogic.actions.recheckIndex();
      expect(IndexViewLogic.values).toEqual(
        expect.objectContaining({
          ...DEFAULT_VALUES,
          fetchIndexApiStatus: Status.LOADING,
          recheckIndexLoading: true,
        })
      );
    });
    it('should be set to false on resetRecheckIndexLoading', () => {
      IndexViewLogic.actions.recheckIndex();
      IndexViewLogic.actions.resetRecheckIndexLoading();
      expect(IndexViewLogic.values).toEqual(
        expect.objectContaining({
          ...DEFAULT_VALUES,
          fetchIndexApiStatus: Status.LOADING,
          recheckIndexLoading: false,
        })
      );
    });
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on makeStartSyncRequest', () => {
      IndexViewLogic.actions.makeStartSyncRequest({ connectorId: 'connectorId' });
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });

    it('calls flashAPIErrors on apiError', () => {
      IndexViewLogic.actions.startSyncApiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });
    it('calls makeFetchIndexRequest on fetchIndex', () => {
      IndexViewLogic.actions.makeFetchIndexRequest = jest.fn();
      IndexNameLogic.actions.setIndexName('indexName');
      IndexViewLogic.actions.fetchIndex();
      expect(IndexViewLogic.actions.makeFetchIndexRequest).toHaveBeenCalledWith({
        indexName: 'indexName',
      });
    });
  });
});
