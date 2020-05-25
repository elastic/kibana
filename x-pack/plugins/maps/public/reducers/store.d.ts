/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import { MapState } from './map';
import { MapUiState } from './ui';
import { NonSerializableState } from './non_serializable_instances';

export interface MapStoreState {
  ui: MapUiState;
  map: MapState;
  nonSerializableInstances: NonSerializableState;
}

export type MapStore = Store<MapStoreState>;

export function createMapStore(): MapStore;

export const DEFAULT_MAP_STORE_STATE: MapStoreState;
