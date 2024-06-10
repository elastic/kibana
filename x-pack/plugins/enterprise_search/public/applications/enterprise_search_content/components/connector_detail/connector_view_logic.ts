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

import {
  hasDocumentLevelSecurityFeature,
  hasIncrementalSyncFeature,
} from '../../utils/connector_helpers';
import { getConnectorLastSeenError, isLastSeenOld } from '../../utils/connector_status_helpers';

import {
  ConnectorNameAndDescriptionLogic,
  ConnectorNameAndDescriptionActions,
} from './connector_name_and_description_logic';

export interface ConnectorViewActions {
  fetchConnector: CachedFetchConnectorByIdApiLogicActions['makeRequest'];
  fetchConnectorApiError: CachedFetchConnectorByIdApiLogicActions['apiError'];
  fetchConnectorApiReset: CachedFetchConnectorByIdApiLogicActions['apiReset'];
  fetchConnectorApiSuccess: CachedFetchConnectorByIdApiLogicActions['apiSuccess'];
  fetchIndex: FetchIndexActions['makeRequest'];
  fetchIndexApiError: FetchIndexActions['apiError'];
  fetchIndexApiReset: FetchIndexActions['apiReset'];
  fetchIndexApiSuccess: FetchIndexActions['apiSuccess'];
  nameAndDescriptionApiError: ConnectorNameAndDescriptionActions['apiError'];
  nameAndDescriptionApiSuccess: ConnectorNameAndDescriptionActions['apiSuccess'];
  startConnectorPoll: CachedFetchConnectorByIdApiLogicActions['startPolling'];
  stopConnectorPoll: CachedFetchConnectorByIdApiLogicActions['stopPolling'];
  updateConnectorConfiguration: PostConnectorConfigurationActions['makeRequest'];
  updateConnectorConfigurationSuccess: PostConnectorConfigurationActions['apiSuccess'];
}

export interface ConnectorViewValues {
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
  isCanceling: boolean;
  isHiddenIndex: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  isWaitingForSync: boolean;
  lastUpdated: string | null;
  pipelineData: IngestPipelineParams | undefined;
  recheckIndexLoading: boolean;
  syncTriggeredLocally: boolean; // holds local value after update so UI updates correctly
  updateConnectorConfigurationStatus: Status;
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
      ConnectorNameAndDescriptionLogic,
      ['apiSuccess as nameAndDescriptionApiSuccess', 'apiError as nameAndDescriptionApiError'],
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
    nameAndDescriptionApiError: () => {
      if (values.connectorId) {
        actions.fetchConnector({ connectorId: values.connectorId });
      }
    },
    nameAndDescriptionApiSuccess: () => {
      if (values.connectorId) {
        actions.fetchConnector({ connectorId: values.connectorId });
      }
    },
    updateConnectorConfigurationSuccess: () => {
      if (values.connectorId) {
        actions.fetchConnector({ connectorId: values.connectorId });
      }
    },
    fetchConnectorApiSuccess: ({ connector }) => {
      if (!values.index && connector?.index_name) {
        actions.fetchIndex({ indexName: connector.index_name });
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
      (connector: Connector | undefined) =>
        connector?.error ||
        connector?.last_sync_error ||
        connector?.last_access_control_sync_error ||
        (connector && isLastSeenOld(connector) && getConnectorLastSeenError(connector)) ||
        null,
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
      (connector?: Connector) => hasDocumentLevelSecurityFeature(connector),
    ],
    hasFilteringFeature: [
      () => [selectors.hasAdvancedFilteringFeature, selectors.hasBasicFilteringFeature],
      (advancedFeature: boolean, basicFeature: boolean) => advancedFeature || basicFeature,
    ],
    hasIncrementalSyncFeature: [
      () => [selectors.connector],
      (connector?: Connector) => hasIncrementalSyncFeature(connector),
    ],
    htmlExtraction: [
      () => [selectors.connector],
      (connector: Connector | undefined) =>
        connector?.configuration.extract_full_html?.value ?? undefined,
    ],
    indexName: [
      () => [selectors.connector],
      (connector: Connector | undefined) => {
        return connector?.index_name || undefined;
      },
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
