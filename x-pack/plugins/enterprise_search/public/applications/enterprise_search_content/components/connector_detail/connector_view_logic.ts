/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector, FeatureName, IngestPipelineParams } from '@kbn/search-connectors';

import {
  FetchConnectorByIdApiLogic,
  FetchConnectorByIdApiLogicActions,
} from '../../api/connector/fetch_connector_by_id_logic';

import { ElasticsearchViewIndex, IngestionMethod, IngestionStatus } from '../../types';

export interface IndexViewActions {
  fetchConnector: FetchConnectorByIdApiLogicActions['makeRequest'];
  fetchConnectorApiSuccess: FetchConnectorByIdApiLogicActions['apiSuccess'];
  fetchConnectorApiError: FetchConnectorByIdApiLogicActions['apiError'];
}

// TODO UPDATE
export interface IndexViewValues {
  connector: typeof FetchConnectorByIdApiLogic.values.data;
  connectorError: string | undefined;
  connectorId: string | null;
  error: string | undefined;
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
  isSyncing: boolean;
  isWaitingForSync: boolean;
  lastUpdated: string | null;
  pipelineData: IngestPipelineParams | undefined;
  recheckIndexLoading: boolean;
  syncTriggeredLocally: boolean; // holds local value after update so UI updates correctly
}

export const ConnectorViewLogic = kea<MakeLogicType<IndexViewValues, IndexViewActions>>({
  actions: {
    fetchIndex: true,
    recheckIndex: true,
  },
  connect: {
    actions: [
      FetchConnectorByIdApiLogic,
      [
        'makeRequest as fetchConnector',
        'apiSuccess as fetchConnectorApiSuccess',
        'apiError as fetchConnectorApiError',
      ],
    ],
    values: [
      FetchConnectorByIdApiLogic,
      ['status as fetchConnectorApiStatus', 'data as connector'],
    ],
  },
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
    connectorError: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.error,
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
    pipelineData: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.pipeline ?? undefined,
    ],
  }),
});
