/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import { MapState } from './map';
import { MapUiState } from './ui';

export interface MapStoreState {
  ui: MapUiState;
  map: MapState;
}

export type MapStore = Store<MapStoreState>;

export function createMapStore(): MapStore;
