/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelId } from '@elastic/eui/src/components/context_menu/context_menu';
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
  /* The generic data stream list */
  dataStreams: DataStream[] | null;
  /* Any error occurred to show when the user preview the generic data streams */
  dataStreamsError?: Error | null;
  /* The integrations list, each integration includes its data streams */
  integrations: Integration[] | null;
  /* Any error occurred to show when the user preview the integrations */
  integrationsError?: Error | null;
  /* Flags for loading/searching integrations or data streams*/
  isLoadingIntegrations: boolean;
  isLoadingStreams: boolean;
  /* Triggered when we reach the bottom of the integration list and want to load more */
  onIntegrationsLoadMore: LoadMoreIntegrations;
  /* Triggered when the user reload the list after an error */
  onIntegrationsReload: ReloadIntegrations;
  /* Triggered when a search or sorting is performed */
  onIntegrationsSearch: SearchIntegrations;
  onIntegrationsSort: SearchIntegrations;
  onIntegrationsStreamsSearch: SearchIntegrations;
  onIntegrationsStreamsSort: SearchIntegrations;
  onUnmanagedStreamsSearch: SearchDataStreams;
  onUnmanagedStreamsSort: SearchDataStreams;
  /* Triggered when retrying to load the data streams */
  onUnmanagedStreamsReload: ReloadDataStreams;
  /* Triggered when the uncategorized streams entry is selected */
  onStreamsEntryClick: LoadDataStreams;
  /* Triggered when a data stream entry is selected */
  onStreamSelected: DataStreamSelectionHandler;
  /* The human-readable name of the currently selected view */
  title: string;
}

export type PanelId =
  | typeof INTEGRATION_PANEL_ID
  | typeof UNMANAGED_STREAMS_PANEL_ID
  | IntegrationId;

export interface SearchParams {
  integrationId?: PanelId;
  name: string;
  sortOrder: SortOrder;
}

export type DataStreamsSelectorSearchParams = Pick<SearchParams, 'name' | 'sortOrder'>;

export type DataStreamsSelectorSearchHandler = (params: DataStreamsSelectorSearchParams) => void;

export type ChangePanelHandler = ({ panelId }: { panelId: EuiContextMenuPanelId }) => void;

export type DataStreamSelectionHandler = (stream: DataStream) => void;
