/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataStream } from '../../../../common/data_streams';
import type { IImmutableCache } from '../../../../common/immutable_cache';
import { SortOrder } from '../../../../common/latest';
import { PanelId } from '../types';

export interface DataStreamsSelectorSearchParams {
  name: string;
  sortOrder: SortOrder;
}

export type DataStreamsSelectorSearchHandler = (params: DataStreamsSelectorSearchParams) => void;

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
      value: 'restorePanel';
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
