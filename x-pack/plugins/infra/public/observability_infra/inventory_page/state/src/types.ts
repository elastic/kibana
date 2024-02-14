/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InventoryFiltersState,
  InventoryOptionsState,
} from '../../../../../common/inventory_views';
import { FilterChangedEvent, OptionsChangedEvent, TimeChangedEvent } from './notifications';

export interface InventoryPageTime {
  currentTime: number;
  isAutoReloading: boolean;
}

export interface InventoryPageContextWithSavedView {
  savedViewId: string;
  savedViewName?: string;
}

export interface InventoryPageContextWithTime {
  time: InventoryPageTime;
}

export interface InventoryPageContextWithOptions {
  options: InventoryOptionsState;
}

export interface InventoryPageContextWithFilter {
  filter: InventoryFiltersState;
}

export interface InventoryPageContextWithError {
  error: Error;
}

export type InventoryPageState = InventoryPageContextWithTime &
  InventoryPageContextWithOptions &
  InventoryPageContextWithFilter &
  InventoryPageContextWithSavedView;

export type InventoryPageTypestate =
  | {
      value: 'uninitialized';
      context: InventoryPageState;
    }
  | {
      value: 'initialized';
      context: InventoryPageState;
    };

export interface InventoryPageCallbacks {
  updateTime: (timeRange: Partial<InventoryPageTime>) => void;
  updateOptions: (options: Partial<InventoryOptionsState>) => void;
  updateFilter: (filter: Partial<InventoryFiltersState>) => void;
}

export type InventoryPageContext = InventoryPageTypestate['context'];
export type InventoryPageEvent =
  | { type: 'INITIALIZED_SAVED_VIEW_ID_FROM_URL'; savedViewId: string }
  | {
      type: 'INITIALIZED_FROM_SAVED_VIEW_SERVICE';
      filter: InventoryFiltersState;
      options: InventoryOptionsState;
      time: InventoryPageTime;
      savedViewName: string;
    }
  | {
      type: 'INITIALIZED_FROM_URL';
      filter: InventoryFiltersState;
      options: InventoryOptionsState;
      time: InventoryPageTime;
    }
  | TimeChangedEvent
  | OptionsChangedEvent
  | FilterChangedEvent;
