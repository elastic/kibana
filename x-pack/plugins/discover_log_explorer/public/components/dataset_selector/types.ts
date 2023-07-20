/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelId } from '@elastic/eui/src/components/context_menu/context_menu';
import { SortOrder } from '../../../common/latest';
import { Dataset, Integration, IntegrationId } from '../../../common/datasets';
import { LoadDatasets, ReloadDatasets, SearchDatasets } from '../../hooks/use_datasets';
import {
  LoadMoreIntegrations,
  ReloadIntegrations,
  SearchIntegrations,
} from '../../hooks/use_integrations';
import { INTEGRATION_PANEL_ID, UNMANAGED_STREAMS_PANEL_ID } from './constants';
import type { DatasetSelection, DatasetSelectionChange } from '../../utils/dataset_selection';

export interface DatasetSelectorProps {
  /* The generic data stream list */
  datasets: Dataset[] | null;
  /* Any error occurred to show when the user preview the generic data streams */
  datasetsError?: Error | null;
  /* The current selection instance */
  datasetSelection: DatasetSelection;
  /* The integrations list, each integration includes its data streams */
  integrations: Integration[] | null;
  /* Any error occurred to show when the user preview the integrations */
  integrationsError: Error | null;
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
  onUnmanagedStreamsSearch: SearchDatasets;
  onUnmanagedStreamsSort: SearchDatasets;
  /* Triggered when retrying to load the data streams */
  onUnmanagedStreamsReload: ReloadDatasets;
  /* Triggered when the uncategorized streams entry is selected */
  onStreamsEntryClick: LoadDatasets;
  /* Triggered when the selection is updated */
  onSelectionChange: DatasetSelectionChange;
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

export type DatasetsSelectorSearchParams = Pick<SearchParams, 'name' | 'sortOrder'>;

export type DatasetsSelectorSearchHandler = (params: DatasetsSelectorSearchParams) => void;

export type ChangePanelHandler = ({ panelId }: { panelId: EuiContextMenuPanelId }) => void;

export type DatasetSelectionHandler = (dataset: Dataset) => void;
