/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DatasetSelection, DatasetSelectionChange } from '../../../utils/dataset_selection';
import { Dataset } from '../../../../common/datasets/models/dataset';
import { ReloadDatasets, SearchDatasets } from '../../../hooks/use_datasets';
import {
  LoadMoreIntegrations,
  ReloadIntegrations,
  SearchIntegrations,
} from '../../../hooks/use_integrations';
import type { IHashedCache } from '../../../../common/hashed_cache';
import { DatasetsSelectorSearchParams, PanelId } from '../types';

export interface DefaultDatasetsSelectorContext {
  selection: DatasetSelection;
  panelId: PanelId;
  searchCache: IHashedCache<PanelId, DatasetsSelectorSearchParams>;
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
      value: 'popover.open.listingIntegrations';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.open.listingIntegrationStreams';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'popover.open.listingUnmanagedStreams';
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
      type: 'CHANGE_PANEL';
      panelId: PanelId;
    }
  | {
      type: 'SELECT_DATASET';
      dataset: Dataset;
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
  onIntegrationsLoadMore: LoadMoreIntegrations;
  onIntegrationsReload: ReloadIntegrations;
  onIntegrationsSearch: SearchIntegrations;
  onIntegrationsSort: SearchIntegrations;
  onIntegrationsStreamsSearch: SearchIntegrations;
  onIntegrationsStreamsSort: SearchIntegrations;
  onSelectionChange: DatasetSelectionChange;
  onUnmanagedStreamsReload: ReloadDatasets;
  onUnmanagedStreamsSearch: SearchDatasets;
  onUnmanagedStreamsSort: SearchDatasets;
}
