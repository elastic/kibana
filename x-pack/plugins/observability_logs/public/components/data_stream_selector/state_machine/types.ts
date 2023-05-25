/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IImmutableCache } from '../../../../common/immutable_cache';
import { SortOrder } from '../../../../common/latest';
import { PanelId } from '../types';

export type ChangePanelHandler = ({ panelId }: { panelId: string }) => void;

export interface DataStreamsSelectorSearchParams {
  name?: string;
  sortOrder?: SortOrder;
}

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
    };

export type DataStreamsSelectorContext = DataStreamsSelectorTypestate['context'];

export type DataStreamsSelectorEvent =
  | {
      type: 'TOGGLE';
    }
  | {
      type: 'CHANGE_PANEL';
      panelId: PanelId;
    };
