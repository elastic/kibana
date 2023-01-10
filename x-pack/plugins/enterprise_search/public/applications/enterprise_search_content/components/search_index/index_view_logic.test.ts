/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';
import { apiIndex, connectorIndex, crawlerIndex } from '../../__mocks__/view_index.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { Status } from '../../../../../common/types/api';

import { SyncStatus } from '../../../../../common/types/connectors';
import { StartSyncApiLogic } from '../../api/connector/start_sync_api_logic';
import { CachedFetchIndexApiLogic } from '../../api/index/cached_fetch_index_api_logic';

import { IngestionMethod, IngestionStatus } from '../../types';

import { indexToViewIndex } from '../../utils/indices';

import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';

// We can't test fetchTimeOutId because this will get set whenever the logic is created
// And the timeoutId is non-deterministic. We use expect.object.containing throughout this test file
const DEFAULT_VALUES = {
  connector: undefined,
  connectorId: null,
  error: null,
  fetchIndexApiData: undefined,
  fetchIndexApiStatus: Status.IDLE,
  hasAdvancedFilteringFeature: false,
  hasBasicFilteringFeature: false,
  hasFilteringFeature: false,
  index: undefined,
  indexData: null,
  indexName: 'index-name',
  ingestionMethod: IngestionMethod.API,
  ingestionStatus: IngestionStatus.CONNECTED,
  isCanceling: false,
  isConnectorIndex: false,
  isInitialLoading: true,
  isSyncing: false,
  isWaitingForSync: false,
  lastUpdated: null,
  localSyncNowValue: false,
  pipelineData: undefined,
  recheckIndexLoading: false,
  syncStatus: null,
};

const CONNECTOR_VALUES = {
  ...DEFAULT_VALUES,
  connectorId: connectorIndex.connector.id,
  index: indexToViewIndex(connectorIndex),
  indexData: connectorIndex,
  ingestionMethod: IngestionMethod.CONNECTOR,
  ingestionStatus: IngestionStatus.CONFIGURED,
  lastUpdated: 'never',
};

describe('IndexViewLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(StartSyncApiLogic);
  const { mount: fetchIndexMount } = new LogicMounter(CachedFetchIndexApiLogic);
  const indexNameLogic = new LogicMounter(IndexNameLogic);
  const { mount } = new LogicMounter(IndexViewLogic);
  const { flashSuccessToast } = mockFlashMessageHelpers;
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    indexNameLogic.mount({ indexName: 'index-name' }, { indexName: 'index-name' });
    apiLogicMount();
    fetchIndexMount({ indexName: 'index-name' }, { indexName: 'index-name' });
    mount({ indexName: 'index-name' }, { indexName: 'index-name' });
  });

  it('has expected default values', () => {
    http.get.mockReturnValueOnce(Promise.resolve(() => ({})));
    mount({ indexName: 'index-name' }, { indexName: 'index-name' });

    expect(IndexViewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('FetchIndexApiWrapperLogic.apiSuccess', () => {
      it('should update values', () => {
        CachedFetchIndexApiLogic.actions.apiSuccess({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector!, sync_now: true },
        });

        expect(IndexViewLogic.values.connector).toEqual({
          ...connectorIndex.connector,
          sync_now: true,
        });

        expect(IndexViewLogic.values.fetchIndexApiData).toEqual({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, sync_now: true },
        });

        expect(IndexViewLogic.values.fetchIndexApiData).toEqual({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, sync_now: true },
        });

        expect(IndexViewLogic.values.index).toEqual({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, sync_now: true },
        });

        expect(IndexViewLogic.values.indexData).toEqual({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, sync_now: true },
        });

        expect(IndexViewLogic.values).toEqual(
          expect.objectContaining({
            ingestionMethod: CONNECTOR_VALUES.ingestionMethod,
            ingestionStatus: CONNECTOR_VALUES.ingestionStatus,
            isCanceling: false,
            isConnectorIndex: true,
            isWaitingForSync: true,
            lastUpdated: CONNECTOR_VALUES.lastUpdated,
            localSyncNowValue: true,
            pipelineData: undefined,
            syncStatus: SyncStatus.COMPLETED,
          })
        );
      });

      it('should update values with no connector', () => {
        CachedFetchIndexApiLogic.actions.apiSuccess(apiIndex);

        expect(IndexViewLogic.values).toEqual(
          expect.objectContaining({
            ...DEFAULT_VALUES,
            fetchIndexApiData: { ...apiIndex },
            fetchIndexApiStatus: Status.SUCCESS,
            index: apiIndex,
            indexData: apiIndex,
            isInitialLoading: false,
          })
        );
      });

      it('should call fetchCrawler if index is a crawler ', () => {
        IndexViewLogic.actions.fetchCrawlerData = jest.fn();
        IndexNameLogic.actions.setIndexName('crawler');
        CachedFetchIndexApiLogic.actions.apiSuccess(crawlerIndex);

        expect(IndexViewLogic.actions.fetchCrawlerData).toHaveBeenCalled();
      });
      it('should not call fetchCrawler if index is a crawler but indexName does not match', () => {
        IndexViewLogic.actions.fetchCrawlerData = jest.fn();
        IndexNameLogic.actions.setIndexName('api');
        CachedFetchIndexApiLogic.actions.apiSuccess(crawlerIndex);

        expect(IndexViewLogic.actions.fetchCrawlerData).not.toHaveBeenCalled();
      });
      it('should flash success if recheckFetchIndexLoading', () => {
        IndexViewLogic.actions.resetRecheckIndexLoading = jest.fn();
        IndexNameLogic.actions.setIndexName('api');
        IndexViewLogic.actions.recheckIndex();
        CachedFetchIndexApiLogic.actions.apiSuccess(apiIndex);

        expect(flashSuccessToast).toHaveBeenCalled();
      });
    });

    describe('startSync', () => {
      it('should call makeStartSyncRequest', async () => {
        // TODO: replace with mounting connectorIndex to FetchIndexApiDirectly to avoid
        // needing to mock out actions unrelated to test called by listeners
        CachedFetchIndexApiLogic.actions.apiSuccess(connectorIndex);
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
    it('calls makeFetchIndexRequest on fetchIndex', () => {
      IndexViewLogic.actions.makeFetchIndexRequest = jest.fn();
      IndexNameLogic.actions.setIndexName('indexName');
      IndexViewLogic.actions.fetchIndex();
      expect(IndexViewLogic.actions.makeFetchIndexRequest).toHaveBeenCalledWith({
        indexName: 'indexName',
      });
    });
  });

  describe('selectors', () => {
    describe('error', () => {
      it('should return connector error if available', () => {
        IndexViewLogic.actions.fetchIndexApiSuccess({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, error: 'error' },
        });
        expect(IndexViewLogic.values.error).toEqual('error');
      });
      it('should return connector last sync error if available and error is undefined', () => {
        IndexViewLogic.actions.fetchIndexApiSuccess({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, last_sync_error: 'last sync error' },
        });
        expect(IndexViewLogic.values.error).toEqual('last sync error');
      });
    });
  });
});
