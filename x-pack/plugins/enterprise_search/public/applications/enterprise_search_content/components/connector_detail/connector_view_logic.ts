/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector, FeatureName, IngestPipelineParams } from '@kbn/search-connectors';

import { Status } from '../../../../../common/types/api';

import {
  FetchConnectorByIdApiLogic,
  FetchConnectorByIdApiLogicActions,
} from '../../api/connector/fetch_connector_by_id_logic';

import { FetchIndexActions, FetchIndexApiLogic } from '../../api/index/fetch_index_api_logic';
import { ElasticsearchViewIndex, IngestionMethod, IngestionStatus } from '../../types';
import { IndexNameActions, IndexNameLogic } from '../search_index/index_name_logic';

export interface ConnectorViewActions {
  fetchConnector: FetchConnectorByIdApiLogicActions['makeRequest'];
  fetchConnectorApiError: FetchConnectorByIdApiLogicActions['apiError'];
  fetchConnectorApiSuccess: FetchConnectorByIdApiLogicActions['apiSuccess'];
  fetchIndex: FetchIndexActions['makeRequest'];
  fetchIndexApiError: FetchIndexActions['apiError'];
  fetchIndexApiSuccess: FetchIndexActions['apiSuccess'];
  setIndexName: IndexNameActions['setIndexName'];
}

export interface ConnectorViewValues {
  connector: Connector | undefined;
  connectorData: typeof FetchConnectorByIdApiLogic.values.data;
  connectorError: string | undefined;
  connectorId: string | null;
  connectorName: string | null;
  error: string | undefined;
  fetchConnectorApiStatus: Status;
  fetchIndexApiStatus: Status;
  hasAdvancedFilteringFeature: boolean;
  hasBasicFilteringFeature: boolean;
  hasDocumentLevelSecurityFeature: boolean;
  hasFilteringFeature: boolean;
  hasIncrementalSyncFeature: boolean;
  htmlExtraction: boolean | undefined;
  index: ElasticsearchViewIndex | undefined;
  indexName: string;
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
  isCanceling: boolean;
  isHiddenIndex: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  isWaitingForSync: boolean;
  lastUpdated: string | null;
  pipelineData: IngestPipelineParams | undefined;
  recheckIndexLoading: boolean;
  syncTriggeredLocally: boolean; // holds local value after update so UI updates correctly
}

export const ConnectorViewLogic = kea<MakeLogicType<ConnectorViewValues, ConnectorViewActions>>({
  actions: {},
  connect: {
    actions: [
      IndexNameLogic,
      ['setIndexName'],
      FetchConnectorByIdApiLogic,
      [
        'makeRequest as fetchConnector',
        'apiSuccess as fetchConnectorApiSuccess',
        'apiError as fetchConnectorApiError',
      ],
      FetchIndexApiLogic,
      [
        'makeRequest as fetchIndex',
        'apiSuccess as fetchIndexApiSuccess',
        'apiError as fetchIndexApiError',
      ],
    ],
    values: [
      FetchConnectorByIdApiLogic,
      ['status as fetchConnectorApiStatus', 'data as connectorData'],
      FetchIndexApiLogic,
      ['data as index', 'status as fetchIndexApiStatus'],
    ],
  },
  listeners: ({ actions, values }) => ({
    fetchConnectorApiSuccess: () => {
      if (values.indexName) {
        actions.fetchIndex({ indexName: values.indexName });
        actions.setIndexName(values.indexName);
      }
    },
  }),
  path: ['enterprise_search', 'content', 'connector_view_logic'],
  reducers: {
    syncTriggeredLocally: [
      false,
      {
        fetchIndexApiSuccess: () => false,
        startSyncApiSuccess: () => true,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    connector: [
      () => [selectors.connectorData],
      (connectorData) => {
        return connectorData?.connector;
      },
    ],
    connectorError: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.error,
    ],
    connectorId: [() => [selectors.connector], (connector) => connector?.id],
    error: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.error || connector?.last_sync_error || null,
    ],
    indexName: [
      () => [selectors.connector],
      (connector: Connector | undefined) => {
        return connector?.index_name || undefined;
      },
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
    hasDocumentLevelSecurityFeature: [
      () => [selectors.connector],
      (connector?: Connector) =>
        connector?.features?.[FeatureName.DOCUMENT_LEVEL_SECURITY]?.enabled || false,
    ],
    hasFilteringFeature: [
      () => [selectors.hasAdvancedFilteringFeature, selectors.hasBasicFilteringFeature],
      (advancedFeature: boolean, basicFeature: boolean) => advancedFeature || basicFeature,
    ],
    hasIncrementalSyncFeature: [
      () => [selectors.connector],
      (connector?: Connector) =>
        connector?.features?.[FeatureName.INCREMENTAL_SYNC]?.enabled || false,
    ],
    htmlExtraction: [
      () => [selectors.connector],
      (connector: Connector | undefined) =>
        connector?.configuration.extract_full_html?.value ?? undefined,
    ],
    isLoading: [
      () => [selectors.fetchConnectorApiStatus, selectors.fetchIndexApiStatus, selectors.index],
      (
        fetchConnectorApiStatus: Status,
        fetchIndexApiStatus: Status,
        index: ConnectorViewValues['index']
      ) =>
        [Status.IDLE && Status.LOADING].includes(fetchConnectorApiStatus) ||
        (index && [Status.IDLE && Status.LOADING].includes(fetchIndexApiStatus)),
    ],
    pipelineData: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.pipeline ?? undefined,
    ],
  }),
});
