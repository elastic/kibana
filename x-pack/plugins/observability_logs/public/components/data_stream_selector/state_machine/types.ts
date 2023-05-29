/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiContextMenuPanelId } from '@elastic/eui/src/components/context_menu/context_menu';
import { ReloadDataStreams, SearchDataStreams } from '../../../hooks/use_data_streams';
import {
  LoadMoreIntegrations,
  ReloadIntegrations,
  SearchIntegrations,
} from '../../../hooks/use_integrations';
import { DataStream } from '../../../../common/data_streams';
import type { IImmutableCache } from '../../../../common/immutable_cache';
import { SortOrder } from '../../../../common/latest';
import { DataStreamSelectionHandler, PanelId } from '../types';

export interface DataStreamsSelectorSearchParams {
  name: string;
  sortOrder: SortOrder;
}

export type DataStreamsSelectorSearchHandler = (params: DataStreamsSelectorSearchParams) => void;

export type ChangePanelHandler = ({ panelId }: { panelId: EuiContextMenuPanelId }) => void;

export interface DefaultDataStreamsSelectorContext {
  panelId: PanelId;
  searchCache: IImmutableCache<PanelId, DataStreamsSelectorSearchParams>;
  search: DataStreamsSelectorSearchParams;
}

export type DataStreamsSelectorTypestate =
  | {
      value: 'closed';
      context: DefaultDataStreamsSelectorContext;
    }
  | {
      value: 'open';
      context: DefaultDataStreamsSelectorContext;
    }
  | {
      value: { open: 'hist' };
      context: DefaultDataStreamsSelectorContext;
    }
  | {
      value: { open: 'listingIntegrations' };
      context: DefaultDataStreamsSelectorContext;
    }
  | {
      value: { open: 'listingIntegrationStreams' };
      context: DefaultDataStreamsSelectorContext;
    }
  | {
      value: { open: 'listingUnmanagedStreams' };
      context: DefaultDataStreamsSelectorContext;
    };

export type DataStreamsSelectorContext = DataStreamsSelectorTypestate['context'];

export type DataStreamsSelectorEvent =
  | {
      type: 'TOGGLE';
    }
  | {
      type: 'CHANGE_PANEL';
      panelId: PanelId;
    }
  | {
      type: 'SELECT_STREAM';
      dataStream: DataStream;
    }
  | {
      type: 'SCROLL_TO_INTEGRATIONS_BOTTOM';
    }
  | {
      type: 'SEARCH_BY_NAME';
      search: DataStreamsSelectorSearchParams;
    }
  | {
      type: 'SORT_BY_ORDER';
      search: DataStreamsSelectorSearchParams;
    };

export interface DataStreamsSelectorStateMachineDependencies {
  initialContext?: DefaultDataStreamsSelectorContext;
  onIntegrationsLoadMore: LoadMoreIntegrations;
  onIntegrationsReload: ReloadIntegrations;
  onIntegrationsSearch: SearchIntegrations;
  onIntegrationsSort: SearchIntegrations;
  onIntegrationsStreamsSearch: SearchIntegrations;
  onIntegrationsStreamsSort: SearchIntegrations;
  onUnmanagedStreamsSearch: SearchDataStreams;
  onUnmanagedStreamsSort: SearchDataStreams;
  onStreamSelected: DataStreamSelectionHandler;
  onUnmanagedStreamsReload: ReloadDataStreams;
}
