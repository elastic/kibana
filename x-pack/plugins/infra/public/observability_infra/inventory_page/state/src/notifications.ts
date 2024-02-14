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
import { InventoryPageTime } from './types';

export interface TimeChangedEvent {
  type: 'TIME_CHANGED';
  time: Partial<InventoryPageTime>;
}

export interface OptionsChangedEvent {
  type: 'OPTIONS_CHANGED';
  options: Partial<InventoryOptionsState>;
}

export interface FilterChangedEvent {
  type: 'FILTER_CHANGED';
  filter: Partial<InventoryFiltersState>;
}
