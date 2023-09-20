/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelId } from '@elastic/eui/src/components/context_menu/context_menu';
import type { DatasetSelection, DatasetSelectionChange } from '../../../common/dataset_selection';
import { SortOrder } from '../../../common/latest';
import { Dataset, Integration, IntegrationId } from '../../../common/datasets';
import { LoadDatasets, ReloadDatasets, SearchDatasets } from '../../hooks/use_datasets';
import {
  LoadMoreIntegrations,
  ReloadIntegrations,
  SearchIntegrations,
} from '../../hooks/use_integrations';
import {
  DATA_VIEWS_TAB_ID,
  INTEGRATIONS_PANEL_ID,
  INTEGRATIONS_TAB_ID,
  UNCATEGORIZED_TAB_ID,
} from './constants';

export interface DatasetSelectorProps {
  /* The generic data stream list */
  datasets: Dataset[] | null;
  /* Any error occurred to show when the user preview the generic data streams */
  datasetsError: Error | null;
  /* The current selection instance */
  datasetSelection: DatasetSelection;
  /* The integrations list, each integration includes its data streams */
  integrations: Integration[] | null;
  /* Any error occurred to show when the user preview the integrations */
  integrationsError: Error | null;
  /* Flags for loading/searching integrations or data streams*/
  isLoadingIntegrations: boolean;
  isLoadingStreams: boolean;
  isSearchingIntegrations: boolean;
  /* Triggered when we reach the bottom of the integration list and want to load more */
  onIntegrationsLoadMore: LoadMoreIntegrations;
  /* Triggered when the user reload the list after an error */
  onIntegrationsReload: ReloadIntegrations;
  /* Triggered when a search or sorting is performed */
  onIntegrationsSearch: SearchIntegrations;
  onIntegrationsSort: SearchIntegrations;
  onIntegrationsStreamsSearch: SearchIntegrations;
  onIntegrationsStreamsSort: SearchIntegrations;
  onUncategorizedSearch: SearchDatasets;
  onUncategorizedSort: SearchDatasets;
  /* Triggered when retrying to load the data streams */
  onUncategorizedReload: ReloadDatasets;
  /* Triggered when the uncategorized streams entry is selected */
  onStreamsEntryClick: LoadDatasets;
  /* Triggered when the selection is updated */
  onSelectionChange: DatasetSelectionChange;
}

export type PanelId = typeof INTEGRATIONS_PANEL_ID | IntegrationId;

export type TabId =
  | typeof INTEGRATIONS_TAB_ID
  | typeof UNCATEGORIZED_TAB_ID
  | typeof DATA_VIEWS_TAB_ID;

export interface SearchParams {
  integrationId?: PanelId;
  name: string;
  sortOrder: SortOrder;
}

export type DatasetsSelectorSearchParams = Pick<SearchParams, 'name' | 'sortOrder'>;

export type DatasetsSelectorSearchHandler = (params: DatasetsSelectorSearchParams) => void;

export type ChangePanelHandler = ({ panelId }: { panelId: EuiContextMenuPanelId }) => void;

export type DatasetSelectionHandler = (dataset: Dataset) => void;
