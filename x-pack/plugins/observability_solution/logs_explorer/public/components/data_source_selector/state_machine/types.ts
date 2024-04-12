/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataViewDescriptor } from '../../../../common/data_views/models/data_view_descriptor';
import { FilterDataViews, SearchDataViews } from '../../../hooks/use_data_views';
import {
  DataSourceSelection,
  DataSourceSelectionChangeHandler,
} from '../../../../common/data_source_selection';
import { Dataset } from '../../../../common/datasets/models/dataset';
import { LoadDatasets, ReloadDatasets, SearchDatasets } from '../../../hooks/use_datasets';
import {
  LoadMoreIntegrations,
  ReloadIntegrations,
  SearchIntegrations,
} from '../../../hooks/use_integrations';
import type { IHashedCache } from '../../../../common/hashed_cache';
import { DataSourceSelectorSearchParams, TabId } from '../types';
import { DataViewsFilterParams } from '../../../state_machines/data_views';

export interface DefaultDataSourceSelectorContext {
  selection: DataSourceSelection;
  tabId: TabId;
  searchCache: IHashedCache<TabId, DataSourceSelectorSearchParams>;
  search: DataSourceSelectorSearchParams;
  dataViewsFilter: DataViewsFilterParams;
}

export type DataSourceSelectorTypestate =
  | {
      value: 'popover';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'popover.closed';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'popover.open';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'popover.open.hist';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'popover.open.integrationsTab';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'popover.open.dataViewsTab';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'selection';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'selection.validatingSelection';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'selection.single';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'selection.dataView';
      context: DefaultDataSourceSelectorContext;
    }
  | {
      value: 'selection.all';
      context: DefaultDataSourceSelectorContext;
    };

export type DataSourceSelectorContext = DataSourceSelectorTypestate['context'];

export type DataSourceSelectorEvent =
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
      type: 'SWITCH_TO_DATA_VIEWS_TAB';
    }
  | {
      type: 'SELECT_DATASET';
      selection: Dataset;
    }
  | {
      type: 'SELECT_DATA_VIEW';
      selection: DataViewDescriptor;
    }
  | {
      type: 'FILTER_BY_TYPE';
      filter: DataViewsFilterParams;
    }
  | {
      type: 'SELECT_ALL_LOGS';
    }
  | {
      type: 'SCROLL_TO_INTEGRATIONS_BOTTOM';
    }
  | {
      type: 'SEARCH_BY_NAME';
      search: DataSourceSelectorSearchParams;
    }
  | {
      type: 'SORT_BY_ORDER';
      search: DataSourceSelectorSearchParams;
    };

export interface DataSourceSelectorStateMachineDependencies {
  initialContext?: Partial<DefaultDataSourceSelectorContext>;
  onDataViewsSearch: SearchDataViews;
  onDataViewsFilter: FilterDataViews;
  onDataViewsSort: SearchDataViews;
  onIntegrationsLoadMore: LoadMoreIntegrations;
  onIntegrationsReload: ReloadIntegrations;
  onIntegrationsSearch: SearchIntegrations;
  onIntegrationsSort: SearchIntegrations;
  onSelectionChange: DataSourceSelectionChangeHandler;
  onUncategorizedLoad: LoadDatasets;
  onUncategorizedReload: ReloadDatasets;
  onUncategorizedSearch: SearchDatasets;
}
