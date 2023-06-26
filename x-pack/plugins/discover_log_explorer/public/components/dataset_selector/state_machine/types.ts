/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Dataset } from '../../../../common/datasets/models/dataset';
import { ReloadDatasets, SearchDatasets } from '../../../hooks/use_datasets';
import {
  LoadMoreIntegrations,
  ReloadIntegrations,
  SearchIntegrations,
} from '../../../hooks/use_integrations';
import type { IHashedCache } from '../../../../common/hashed_cache';
import { DatasetSelectionHandler, DatasetsSelectorSearchParams, PanelId } from '../types';

export interface DefaultDatasetsSelectorContext {
  selected?: Dataset;
  panelId: PanelId;
  searchCache: IHashedCache<PanelId, DatasetsSelectorSearchParams>;
  search: DatasetsSelectorSearchParams;
}

export type DatasetsSelectorTypestate =
  | {
      value: 'closed';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: 'open';
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: { open: 'hist' };
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: { open: 'listingIntegrations' };
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: { open: 'listingIntegrationStreams' };
      context: DefaultDatasetsSelectorContext;
    }
  | {
      value: { open: 'listingUnmanagedStreams' };
      context: DefaultDatasetsSelectorContext;
    };

export type DatasetsSelectorContext = DatasetsSelectorTypestate['context'];

export type DatasetsSelectorEvent =
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
  onDatasetSelected: DatasetSelectionHandler;
  onUnmanagedStreamsReload: ReloadDatasets;
  onUnmanagedStreamsSearch: SearchDatasets;
  onUnmanagedStreamsSort: SearchDatasets;
}
