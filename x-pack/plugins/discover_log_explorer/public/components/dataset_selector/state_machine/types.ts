/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ReloadDatasets, SearchDatasets } from '../../../hooks/use_datasets';
import {
  LoadMoreIntegrations,
  ReloadIntegrations,
  SearchIntegrations,
} from '../../../hooks/use_integrations';
import { Dataset } from '../../../../common/datasets';
import type { IImmutableCache } from '../../../../common/immutable_cache';
import { DatasetSelectionHandler, DatasetsSelectorSearchParams, PanelId } from '../types';

export interface DefaultDatasetsSelectorContext {
  panelId: PanelId;
  searchCache: IImmutableCache<PanelId, DatasetsSelectorSearchParams>;
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
      type: 'SELECT_STREAM';
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
  initialContext?: DefaultDatasetsSelectorContext;
  onIntegrationsLoadMore: LoadMoreIntegrations;
  onIntegrationsReload: ReloadIntegrations;
  onIntegrationsSearch: SearchIntegrations;
  onIntegrationsSort: SearchIntegrations;
  onIntegrationsStreamsSearch: SearchIntegrations;
  onIntegrationsStreamsSort: SearchIntegrations;
  onStreamSelected: DatasetSelectionHandler;
  onUnmanagedStreamsReload: ReloadDatasets;
  onUnmanagedStreamsSearch: SearchDatasets;
  onUnmanagedStreamsSort: SearchDatasets;
}
