/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  Connector,
  FeatureName,
  IngestPipelineParams,
  IngestionMethod,
  IngestionStatus,
} from '@kbn/search-connectors';

import { Status } from '../../../../../common/types/api';

import {
  CachedFetchConnectorByIdApiLogic,
  CachedFetchConnectorByIdApiLogicActions,
  CachedFetchConnectorByIdApiLogicValues,
} from '../../api/connector/cached_fetch_connector_by_id_api_logic';

import {
  ConnectorConfigurationApiLogic,
  PostConnectorConfigurationActions,
} from '../../api/connector/update_connector_configuration_api_logic';
import { FetchIndexActions, FetchIndexApiLogic } from '../../api/index/fetch_index_api_logic';
import { ElasticsearchViewIndex } from '../../types';

export interface ConnectorViewActions {
  fetchConnector: CachedFetchConnectorByIdApiLogicActions['makeRequest'];
  fetchConnectorApiError: CachedFetchConnectorByIdApiLogicActions['apiError'];
  fetchConnectorApiReset: CachedFetchConnectorByIdApiLogicActions['apiReset'];
  fetchConnectorApiSuccess: CachedFetchConnectorByIdApiLogicActions['apiSuccess'];
  startConnectorPoll: CachedFetchConnectorByIdApiLogicActions['startPolling'];
  stopConnectorPoll: CachedFetchConnectorByIdApiLogicActions['stopPolling'];
  fetchIndex: FetchIndexActions['makeRequest'];
  fetchIndexApiError: FetchIndexActions['apiError'];
  fetchIndexApiReset: FetchIndexActions['apiReset'];
  fetchIndexApiSuccess: FetchIndexActions['apiSuccess'];
  updateConnectorConfiguration: PostConnectorConfigurationActions['makeRequest'];
  updateConnectorConfigurationSuccess: PostConnectorConfigurationActions['apiSuccess'];
}

export interface ConnectorViewValues {
  updateConnectorConfigurationStatus: Status;
  connector: Connector | undefined;
  connectorData: CachedFetchConnectorByIdApiLogicValues['connectorData'];
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
      CachedFetchConnectorByIdApiLogic,
      [
        'makeRequest as fetchConnector',
        'apiSuccess as fetchConnectorApiSuccess',
        'apiError as fetchConnectorApiError',
        'apiReset as fetchConnectorApiReset',
        'startPolling as startConnectorPoll',
        'stopPolling as stopConnectorPoll',
      ],
      FetchIndexApiLogic,
      [
        'makeRequest as fetchIndex',
        'apiSuccess as fetchIndexApiSuccess',
        'apiError as fetchIndexApiError',
        'apiReset as fetchIndexApiReset',
      ],
      ConnectorConfigurationApiLogic,
      [
        'makeRequest as updateConnectorConfiguration',
        'apiSuccess as updateConnectorConfigurationSuccess',
      ],
    ],
    values: [
      CachedFetchConnectorByIdApiLogic,
      ['status as fetchConnectorApiStatus', 'connectorData', 'isInitialLoading'],
      FetchIndexApiLogic,
      ['data as index', 'status as fetchIndexApiStatus'],
      ConnectorConfigurationApiLogic,
      ['status as updateConnectorConfigurationStatus'],
    ],
  },
  events: ({ actions }) => ({
    beforeUnmount: () => {
      actions.stopConnectorPoll();
      actions.fetchConnectorApiReset();
    },
  }),
  listeners: ({ actions, values }) => ({
    updateConnectorConfigurationSuccess: () => {
      if (values.connectorId) {
        actions.fetchConnector({ connectorId: values.connectorId });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'connector_view_logic'],
  selectors: ({ selectors }) => ({
    connector: [
      () => [selectors.connectorData],
      (connectorData) => {
        return connectorData;
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
