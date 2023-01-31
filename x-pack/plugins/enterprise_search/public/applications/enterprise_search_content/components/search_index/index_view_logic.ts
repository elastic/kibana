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
  FeatureName,
  IngestPipelineParams,
  SyncStatus,
} from '../../../../../common/types/connectors';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import { flashSuccessToast } from '../../../shared/flash_messages';

import { StartSyncApiLogic, StartSyncArgs } from '../../api/connector/start_sync_api_logic';
import {
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicActions,
} from '../../api/index/cached_fetch_index_api_logic';

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

type StartSyncApiActions = Actions<StartSyncArgs, {}>;

export interface IndexViewActions {
  cancelSyncs(): void;
  clearFetchIndexTimeout(): void;
  createNewFetchIndexTimeout(duration: number): { duration: number };
  fetchCrawlerData: () => void;
  fetchIndex: () => void;
  fetchIndexApiSuccess: CachedFetchIndexApiLogicActions['apiSuccess'];
  makeFetchIndexRequest: CachedFetchIndexApiLogicActions['makeRequest'];
  makeStartSyncRequest: StartSyncApiActions['makeRequest'];
  recheckIndex: () => void;
  resetFetchIndexApi: CachedFetchIndexApiLogicActions['apiReset'];
  resetRecheckIndexLoading: () => void;
  startFetchIndexPoll: CachedFetchIndexApiLogicActions['startPolling'];
  startSync(): void;
  stopFetchIndexPoll(): CachedFetchIndexApiLogicActions['stopPolling'];
  stopFetchIndexPoll(): void;
}

export interface IndexViewValues {
  connector: Connector | undefined;
  connectorError: string | undefined;
  connectorId: string | null;
  error: string | undefined;
  fetchIndexApiData: typeof CachedFetchIndexApiLogic.values.fetchIndexApiData;
  fetchIndexApiStatus: Status;
  hasAdvancedFilteringFeature: boolean;
  hasBasicFilteringFeature: boolean;
  hasFilteringFeature: boolean;
  index: ElasticsearchViewIndex | undefined;
  indexData: typeof CachedFetchIndexApiLogic.values.indexData;
  indexName: string;
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
  isCanceling: boolean;
  isInitialLoading: typeof CachedFetchIndexApiLogic.values.isInitialLoading;
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
    fetchIndex: true,
    recheckIndex: true,
    resetRecheckIndexLoading: true,
    startSync: true,
  },
  connect: {
    actions: [
      IndexNameLogic,
      ['setIndexName'],
      CachedFetchIndexApiLogic,
      [
        'apiError as fetchIndexApiError',
        'apiReset as resetFetchIndexApi',
        'apiSuccess as fetchIndexApiSuccess',
        'makeRequest as makeFetchIndexRequest',
        'startPolling as startFetchIndexPoll',
        'stopPolling as stopFetchIndexPoll',
      ],
      StartSyncApiLogic,
      ['apiSuccess as startSyncApiSuccess', 'makeRequest as makeStartSyncRequest'],
      CrawlerLogic,
      ['fetchCrawlerData'],
    ],
    values: [
      IndexNameLogic,
      ['indexName'],
      CachedFetchIndexApiLogic,
      ['fetchIndexApiData', 'status as fetchIndexApiStatus', 'indexData', 'isInitialLoading'],
    ],
  },
  events: ({ actions }) => ({
    beforeUnmount: () => {
      actions.stopFetchIndexPoll();
      actions.resetFetchIndexApi();
    },
  }),
  listeners: ({ actions, values }) => ({
    fetchIndex: () => {
      const { indexName } = IndexNameLogic.values;
      actions.makeFetchIndexRequest({ indexName });
    },
    fetchIndexApiSuccess: (index) => {
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
    recheckIndex: () => actions.fetchIndex(),
    setIndexName: ({ indexName }) => {
      actions.startFetchIndexPoll(indexName);
    },
    startSync: () => {
      if (isConnectorIndex(values.fetchIndexApiData)) {
        actions.makeStartSyncRequest({ connectorId: values.fetchIndexApiData.connector.id });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'index_view_logic'],
  reducers: {
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
    connectorError: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.error,
    ],
    connectorId: [
      () => [selectors.indexData],
      (index) => (isConnectorViewIndex(index) ? index.connector.id : null),
    ],
    error: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.error || connector?.last_sync_error || null,
    ],
    hasAdvancedFilteringFeature: [
      () => [selectors.connector],
      (connector?: Connector) =>
        connector?.features
          ? connector.features[FeatureName.SYNC_RULES]?.advanced?.enabled ??
            connector.features[FeatureName.FILTERING_ADVANCED_CONFIG]
          : false,
    ],
    hasBasicFilteringFeature: [
      () => [selectors.connector],
      (connector?: Connector) =>
        connector?.features
          ? connector.features[FeatureName.SYNC_RULES]?.basic?.enabled ??
            connector.features[FeatureName.FILTERING_RULES]
          : false,
    ],
    hasFilteringFeature: [
      () => [selectors.hasAdvancedFilteringFeature, selectors.hasBasicFilteringFeature],
      (advancedFeature: boolean, basicFeature: boolean) => advancedFeature || basicFeature,
    ],
    index: [
      () => [selectors.indexData],
      (data: IndexViewValues['indexData']) => (data ? indexToViewIndex(data) : undefined),
    ],
    ingestionMethod: [() => [selectors.indexData], (data) => getIngestionMethod(data)],
    ingestionStatus: [() => [selectors.indexData], (data) => getIngestionStatus(data)],
    isCanceling: [
      () => [selectors.syncStatus],
      (syncStatus: SyncStatus) => syncStatus === SyncStatus.CANCELING,
    ],
    isConnectorIndex: [
      () => [selectors.indexData],
      (data: ElasticsearchIndexWithIngestion | undefined) => isConnectorIndex(data),
    ],
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
