/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { SearchDataViews } from '../../../hooks/use_data_views';
import {
  DatasetSelection,
  DatasetSelectionChange,
  DataViewSelection,
} from '../../../../common/dataset_selection';
import { Dataset } from '../../../../common/datasets/models/dataset';
import { ReloadDatasets, SearchDatasets } from '../../../hooks/use_datasets';
import {
  LoadMoreIntegrations,
  ReloadIntegrations,
  SearchIntegrations,
} from '../../../hooks/use_integrations';
import type { IHashedCache } from '../../../../common/hashed_cache';
import { DatasetsSelectorSearchParams, PanelId, TabId } from '../types';

export interface DefaultDatasetsSelectorContext {
  selection: DatasetSelection;
  tabId: TabId;
  panelId: PanelId;
  searchCache: IHashedCache<PanelId | TabId, DatasetsSelectorSearchParams>;
  search: DatasetsSelectorSearchParams;
}

export type DatasetsSelectorTypestate =
  | {
      value: 'popover';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.closed';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.open';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.open.hist';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.open.integrationsTab';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.open.integrationsTab.listingIntegrations';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.open.integrationsTab.listingIntegrationStreams';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.open.uncategorizedTab';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.open.dataViewsTab';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'selection';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'selection.single';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'selection.all';
      context: DefaultDatasetsSelectorContext;
    };

export type DatasetsSelectorContext = DatasetsSelectorTypestate['context'];

export type DatasetsSelectorEvent =
  | {
      type: 'CLOSE';
    }
  | {
      type: 'TOGGLE';
    }
  | {
      type: 'SWITCH_TO_INTEGRATIONS_TAB';
    }
  | {
      type: 'SWITCH_TO_UNCATEGORIZED_TAB';
    }
  | {
      type: 'SWITCH_TO_DATA_VIEWS_TAB';
    }
  | {
      type: 'CHANGE_PANEL';
      panelId: PanelId;
    }
  | {
      type: 'SELECT_DATASET';
      dataset: Dataset;
    }
  | {
      type: 'SELECT_DATA_VIEW';
      dataView: DataViewListItem;
    }
  | {
      type: 'SELECT_ALL_LOGS_DATASET';
    }
  | {
      type: 'SCROLL_TO_INTEGRATIONS_BOTTOM';
    }
  | {
      type: 'SEARCH_BY_NAME';
      search: DatasetsSelectorSearchParams;
    }
  | {
      type: 'SORT_BY_ORDER';
      search: DatasetsSelectorSearchParams;
    };

export interface DatasetsSelectorStateMachineDependencies {
  initialContext?: Partial<DefaultDatasetsSelectorContext>;
  onDataViewSelection: DataViewSelection;
  onDataViewsSearch: SearchDataViews;
  onDataViewsSort: SearchDataViews;
  onIntegrationsLoadMore: LoadMoreIntegrations;
  onIntegrationsReload: ReloadIntegrations;
  onIntegrationsSearch: SearchIntegrations;
  onIntegrationsSort: SearchIntegrations;
  onIntegrationsStreamsSearch: SearchIntegrations;
  onIntegrationsStreamsSort: SearchIntegrations;
  onSelectionChange: DatasetSelectionChange;
  onUncategorizedReload: ReloadDatasets;
  onUncategorizedSearch: SearchDatasets;
  onUncategorizedSort: SearchDatasets;
}
