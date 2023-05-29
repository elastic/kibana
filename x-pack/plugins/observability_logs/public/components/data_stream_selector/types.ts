/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationId, SortOrder } from '../../../common';
import { DataStream, Integration } from '../../../common/data_streams';
import {
  LoadDataStreams,
  ReloadDataStreams,
  SearchDataStreams,
} from '../../hooks/use_data_streams';
import {
  LoadMoreIntegrations,
  ReloadIntegrations,
  SearchIntegrations,
} from '../../hooks/use_integrations';
import { INTEGRATION_PANEL_ID, UNMANAGED_STREAMS_PANEL_ID } from './constants';

export interface DataStreamSelectorProps {
  /* The human-readable name of the currently selected view */
  title: string;
  /* The integrations list, each integration includes its data streams */
  integrations: Integration[] | null;
  /* Any error occurred to show when the user preview the integrations */
  integrationsError?: Error | null;
  /* The generic data stream list */
  dataStreams: DataStream[] | null;
  /* Any error occurred to show when the user preview the generic data streams */
  dataStreamsError?: Error | null;
  /* Flag for loading/searching integrations */
  isLoadingIntegrations: boolean;
  /* Flag for loading/searching generic streams */
  isLoadingStreams: boolean;
  /* Triggered when a search or sorting is performed */
  onIntegrationsSearch: SearchIntegrations;
  onIntegrationsSort: SearchIntegrations;
  onIntegrationsStreamsSearch: SearchIntegrations;
  onIntegrationsStreamsSort: SearchIntegrations;
  onUnmanagedStreamsSearch: SearchDataStreams;
  onUnmanagedStreamsSort: SearchDataStreams;
  /* Triggered when we reach the bottom of the integration list and want to load more */
  onIntegrationsLoadMore: LoadMoreIntegrations;
  /* Triggered when we reach the bottom of the integration list and want to load more */
  onIntegrationsReload: ReloadIntegrations;
  /* Triggered when the uncategorized streams entry is selected */
  onStreamsEntryClick: LoadDataStreams;
  /* Triggered when retrying to load the data streams */
  onUnmanagedStreamsReload: ReloadDataStreams;
  /* Triggered when a data stream entry is selected */
  onStreamSelected: DataStreamSelectionHandler;
}

export type PanelId =
  | typeof INTEGRATION_PANEL_ID
  | typeof UNMANAGED_STREAMS_PANEL_ID
  | IntegrationId;

export interface SearchParams {
  integrationId?: PanelId;
  name?: string;
  sortOrder?: SortOrder;
}

export type SearchControlsParams = Pick<SearchParams, 'name' | 'sortOrder'>;

export type DataStreamSelectionHandler = (stream: DataStream) => void;
