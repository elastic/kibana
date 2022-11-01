/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../common/types/api';
import {
  Connector,
  IngestPipelineParams,
  SyncStatus,
} from '../../../../../common/types/connectors';

import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  flashAPIErrors,
  clearFlashMessages,
  flashSuccessToast,
} from '../../../shared/flash_messages';

import { StartSyncApiLogic, StartSyncArgs } from '../../api/connector/start_sync_api_logic';
import {
  FetchIndexApiWrapperLogic,
  FetchIndexApiWrapperLogicActions,
} from '../../api/index/fetch_index_wrapper_logic';

import { ElasticsearchViewIndex, IngestionMethod, IngestionStatus } from '../../types';
import {
  getIngestionMethod,
  getIngestionStatus,
  getLastUpdated,
  indexToViewIndex,
  isConnectorIndex,
  isConnectorViewIndex,
  isCrawlerIndex,
} from '../../utils/indices';

import { CrawlerLogic } from './crawler/crawler_logic';
import { IndexNameLogic } from './index_name_logic';

const FETCH_INDEX_POLLING_DURATION = 5000; // 1 seconds
const FETCH_INDEX_POLLING_DURATION_ON_FAILURE = 30000; // 30 seconds

type StartSyncApiValues = Actions<StartSyncArgs, {}>;

export interface IndexViewActions {
  clearFetchIndexTimeout(): void;
  createNewFetchIndexTimeout(duration: number): { duration: number };
  fetchCrawlerData: () => void;
  fetchIndex: () => void;
  fetchIndexApiSuccess: FetchIndexApiWrapperLogicActions['apiSuccess'];
  makeFetchIndexRequest: FetchIndexApiWrapperLogicActions['makeRequest'];
  makeStartSyncRequest: StartSyncApiValues['makeRequest'];
  recheckIndex: () => void;
  resetFetchIndexApi: FetchIndexApiWrapperLogicActions['apiReset'];
  resetRecheckIndexLoading: () => void;
  setFetchIndexTimeoutId(timeoutId: NodeJS.Timeout): { timeoutId: NodeJS.Timeout };
  startFetchIndexPoll(): void;
  startSync(): void;
  startSyncApiError: StartSyncApiValues['apiError'];
  startSyncApiSuccess: StartSyncApiValues['apiSuccess'];
  stopFetchIndexPoll(): void;
}

export interface IndexViewValues {
  connector: Connector | undefined;
  connectorId: string | null;
  fetchIndexApiData: typeof FetchIndexApiWrapperLogic.values.fetchIndexApiData;
  fetchIndexApiStatus: Status;
  fetchIndexTimeoutId: NodeJS.Timeout | null;
  index: ElasticsearchViewIndex | undefined;
  indexData: typeof FetchIndexApiWrapperLogic.values.indexData;
  indexName: string;
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
  isSyncing: boolean;
  isWaitingForSync: boolean;
  lastUpdated: string | null;
  localSyncNowValue: boolean; // holds local value after update so UI updates correctly
  pipelineData: IngestPipelineParams | undefined;
  recheckIndexLoading: boolean;
  resetFetchIndexLoading: boolean;
  syncStatus: SyncStatus | null;
  wrapperIsInitialLoad: typeof FetchIndexApiWrapperLogic.values.isInitialLoading;
}

export const IndexViewLogic = kea<MakeLogicType<IndexViewValues, IndexViewActions>>({
  actions: {
    clearFetchIndexTimeout: true,
    createNewFetchIndexTimeout: (duration) => ({ duration }),
    fetchIndex: true,
    recheckIndex: true,
    resetRecheckIndexLoading: true,
    setFetchIndexTimeoutId: (timeoutId) => ({ timeoutId }),
    startFetchIndexPoll: true,
    startSync: true,
    stopFetchIndexPoll: true,
  },
  connect: {
    actions: [
      StartSyncApiLogic,
      [
        'apiError as startSyncApiError',
        'apiSuccess as startSyncApiSuccess',
        'makeRequest as makeStartSyncRequest',
      ],
      FetchIndexApiWrapperLogic,
      [
        'apiError as fetchIndexApiError',
        'apiReset as resetFetchIndexApi',
        'apiSuccess as fetchIndexApiSuccess',
        'makeRequest as makeFetchIndexRequest',
      ],
      CrawlerLogic,
      ['fetchCrawlerData'],
      IndexNameLogic,
      ['setIndexName'],
    ],
    values: [
      IndexNameLogic,
      ['indexName'],
      FetchIndexApiWrapperLogic,
      [
        'fetchIndexApiData',
        'status as fetchIndexApiStatus',
        'indexData',
        'isInitialLoading as wrapperIsInitialLoad',
      ],
    ],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      actions.startFetchIndexPoll();
    },
    beforeUnmount: () => {
      if (values.fetchIndexTimeoutId) {
        clearTimeout(values.fetchIndexTimeoutId);
      }
    },
  }),
  listeners: ({ actions, values }) => ({
    createNewFetchIndexTimeout: ({ duration }) => {
      if (values.fetchIndexTimeoutId) {
        clearTimeout(values.fetchIndexTimeoutId);
      }
      const timeoutId = setTimeout(() => {
        actions.fetchIndex();
      }, duration);
      actions.setFetchIndexTimeoutId(timeoutId);
    },
    fetchIndex: () => {
      const { indexName } = IndexNameLogic.values;
      actions.makeFetchIndexRequest({ indexName });
    },
    fetchIndexApiError: () => {
      actions.createNewFetchIndexTimeout(FETCH_INDEX_POLLING_DURATION_ON_FAILURE);
    },
    fetchIndexApiSuccess: (index) => {
      actions.createNewFetchIndexTimeout(FETCH_INDEX_POLLING_DURATION);
      if (isCrawlerIndex(index) && index.name === values.indexName) {
        actions.fetchCrawlerData();
      }
      if (values.recheckIndexLoading) {
        actions.resetRecheckIndexLoading();
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.content.searchIndex.index.recheckSuccess.message',
            {
              defaultMessage: 'Your connector has been rechecked.',
            }
          )
        );
      }
    },
    makeStartSyncRequest: () => clearFlashMessages(),
    recheckIndex: () => actions.fetchIndex(),
    setIndexName: () => {
      if (values.fetchIndexTimeoutId) {
        clearTimeout(values.fetchIndexTimeoutId);
      }
      actions.clearFetchIndexTimeout();
      actions.resetFetchIndexApi();
      actions.fetchIndex();
    },
    startFetchIndexPoll: () => {
      // we rely on listeners for fetchIndexApiError and fetchIndexApiSuccess to handle reccuring polling
      actions.fetchIndex();
    },
    startSync: () => {
      if (isConnectorIndex(values.fetchIndexApiData)) {
        actions.makeStartSyncRequest({ connectorId: values.fetchIndexApiData.connector.id });
      }
    },
    startSyncApiError: (e) => flashAPIErrors(e),
    startSyncApiSuccess: () => {
      flashSuccessToast(
        i18n.translate('xpack.enterpriseSearch.content.searchIndex.index.syncSuccess.message', {
          defaultMessage: 'Successfully scheduled a sync, waiting for a connector to pick it up',
        })
      );
    },
    stopFetchIndexPoll: () => {
      if (values.fetchIndexTimeoutId) {
        clearTimeout(values.fetchIndexTimeoutId);
      }
      actions.clearFetchIndexTimeout();
      actions.resetFetchIndexApi();
    },
  }),
  path: ['enterprise_search', 'content', 'index_view_logic'],
  reducers: {
    fetchIndexTimeoutId: [
      null,
      {
        clearFetchIndexTimeout: () => null,
        setFetchIndexTimeoutId: (_, { timeoutId }) => timeoutId,
      },
    ],
    localSyncNowValue: [
      false,
      {
        fetchIndexApiSuccess: (_, index) =>
          isConnectorIndex(index) ? index.connector.sync_now : false,
        startSyncApiSuccess: () => true,
      },
    ],
    recheckIndexLoading: [
      false,
      {
        recheckIndex: () => true,
        resetRecheckIndexLoading: () => false,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    connector: [
      () => [selectors.indexData],
      (index) =>
        index && (isConnectorViewIndex(index) || isCrawlerIndex(index))
          ? index.connector
          : undefined,
    ],
    connectorId: [
      () => [selectors.indexData],
      (index) => (isConnectorViewIndex(index) ? index.connector.id : null),
    ],
    index: [
      () => [selectors.indexData],
      (data: IndexViewValues['indexData']) => (data ? indexToViewIndex(data) : undefined),
    ],
    ingestionMethod: [() => [selectors.fetchIndexApiData], (data) => getIngestionMethod(data)],
    ingestionStatus: [() => [selectors.fetchIndexApiData], (data) => getIngestionStatus(data)],
    isSyncing: [
      () => [selectors.syncStatus],
      (syncStatus: SyncStatus) => syncStatus === SyncStatus.IN_PROGRESS,
    ],
    isWaitingForSync: [
      () => [selectors.fetchIndexApiData, selectors.localSyncNowValue],
      (data, localSyncNowValue) => data?.connector?.sync_now || localSyncNowValue,
    ],
    lastUpdated: [() => [selectors.fetchIndexApiData], (data) => getLastUpdated(data)],
    pipelineData: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.pipeline ?? undefined,
    ],
    syncStatus: [
      () => [selectors.fetchIndexApiData],
      (data) => data?.connector?.last_sync_status ?? null,
    ],
  }),
});
