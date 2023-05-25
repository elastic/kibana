/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationId, SortOrder } from '../../../common';
import { DataStream, Integration, SearchStrategy } from '../../../common/data_streams';
import { LoadMoreIntegrations } from '../../hooks/use_integrations';
import { INTEGRATION_PANEL_ID, UNCATEGORIZED_STREAMS_PANEL_ID } from './constants';

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
  /* Triggered when a search or sorting is performed on integrations */
  onSearch: SearchHandler;
  /* Triggered when we reach the bottom of the integration list and want to load more */
  onIntegrationsLoadMore: LoadMoreIntegrations;
  /* Triggered when we reach the bottom of the integration list and want to load more */
  onIntegrationsReload: LoadMoreIntegrations;
  /* Triggered when the uncategorized streams entry is selected */
  onStreamsEntryClick: () => void;
  /* Triggered when retrying to load the data streams */
  onStreamsReload: () => void;
  /* Triggered when a data stream entry is selected */
  onStreamSelected: DataStreamSelectionHandler;
}

export type PanelId =
  | typeof INTEGRATION_PANEL_ID
  | typeof UNCATEGORIZED_STREAMS_PANEL_ID
  | IntegrationId;

export interface SearchParams {
  integrationId?: PanelId;
  name?: string;
  sortOrder?: SortOrder;
  strategy: SearchStrategy;
}

export type SearchControlsParams = Pick<SearchParams, 'name' | 'sortOrder'>;

export type SearchHandler = (params: SearchParams) => void;

export type DataStreamSelectionHandler = (stream: DataStream) => void;
