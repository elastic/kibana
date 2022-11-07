/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import {
  Connector,
  IngestPipelineParams,
  SyncStatus,
} from '../../../../../common/types/connectors';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  flashAPIErrors,
  clearFlashMessages,
  flashSuccessToast,
} from '../../../shared/flash_messages';
import { StartSyncApiLogic, StartSyncArgs } from '../../api/connector/start_sync_api_logic';
import {
  FetchIndexApiLogic,
  FetchIndexApiParams,
  FetchIndexApiResponse,
} from '../../api/index/fetch_index_api_logic';
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

type FetchIndexApiActions = Actions<FetchIndexApiParams, FetchIndexApiResponse>;
type StartSyncApiActions = Actions<StartSyncArgs, {}>;

export interface IndexViewActions {
  cancelSyncs(): void;
  clearFetchIndexTimeout(): void;
  createNewFetchIndexTimeout(duration: number): { duration: number };
  fetchCrawlerData: () => void;
  fetchIndex: () => void;
  fetchIndexApiSuccess: FetchIndexApiActions['apiSuccess'];
  makeFetchIndexRequest: FetchIndexApiActions['makeRequest'];
  makeStartSyncRequest: StartSyncApiActions['makeRequest'];
  recheckIndex: () => void;
  resetFetchIndexApi: FetchIndexApiActions['apiReset'];
  resetRecheckIndexLoading: () => void;
  setFetchIndexTimeoutId(timeoutId: NodeJS.Timeout): { timeoutId: NodeJS.Timeout };
  startFetchIndexPoll(): void;
  startSync(): void;
  startSyncApiError: StartSyncApiActions['apiError'];
  startSyncApiSuccess: StartSyncApiActions['apiSuccess'];
  stopFetchIndexPoll(): void;
}

export interface IndexViewValues {
  connector: Connector | undefined;
  connectorId: string | null;
  data: typeof FetchIndexApiLogic.values.data;
  fetchIndexTimeoutId: NodeJS.Timeout | null;
  index: ElasticsearchViewIndex | undefined;
  indexName: string;
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
  isCanceling: boolean;
  isSyncing: boolean;
  isWaitingForSync: boolean;
  lastUpdated: string | null;
  localSyncNowValue: boolean; // holds local value after update so UI updates correctly
  pipelineData: IngestPipelineParams | undefined;
  recheckIndexLoading: boolean;
  resetFetchIndexLoading: boolean;
  syncStatus: SyncStatus | null;
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
      FetchIndexApiLogic,
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
    values: [FetchIndexApiLogic, ['data'], IndexNameLogic, ['indexName']],
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
      if (isConnectorIndex(values.data)) {
        actions.makeStartSyncRequest({ connectorId: values.data.connector.id });
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
      () => [selectors.index],
      (index: ElasticsearchViewIndex | undefined) =>
        index && (isConnectorViewIndex(index) || isCrawlerIndex(index))
          ? index.connector
          : undefined,
    ],
    connectorId: [
      () => [selectors.index],
      (index) => (isConnectorViewIndex(index) ? index.connector.id : null),
    ],
    index: [() => [selectors.data], (data) => (data ? indexToViewIndex(data) : undefined)],
    ingestionMethod: [() => [selectors.data], (data) => getIngestionMethod(data)],
    ingestionStatus: [() => [selectors.data], (data) => getIngestionStatus(data)],
    isCanceling: [
      () => [selectors.syncStatus],
      (syncStatus: SyncStatus) => syncStatus === SyncStatus.CANCELING,
    ],
    isConnectorIndex: [
      () => [selectors.data],
      (data: ElasticsearchIndexWithIngestion | undefined) => isConnectorIndex(data),
    ],
    isSyncing: [
      () => [selectors.syncStatus],
      (syncStatus: SyncStatus) => syncStatus === SyncStatus.IN_PROGRESS,
    ],
    isWaitingForSync: [
      () => [selectors.data, selectors.localSyncNowValue],
      (data, localSyncNowValue) => data?.connector?.sync_now || localSyncNowValue,
    ],
    lastUpdated: [() => [selectors.data], (data) => getLastUpdated(data)],
    pipelineData: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.pipeline ?? undefined,
    ],
    syncStatus: [() => [selectors.data], (data) => data?.connector?.last_sync_status ?? null],
  }),
});
