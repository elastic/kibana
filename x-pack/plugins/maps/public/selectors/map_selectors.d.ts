/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';
import { MapCenter } from '../../common/descriptor_types';
import { MapStoreState } from '../reducers/store';
import { MapSettings } from '../reducers/map';
import { IVectorLayer } from '../layers/vector_layer';

export function getHiddenLayerIds(state: MapStoreState): string[];

export function getMapZoom(state: MapStoreState): number;

export function getMapCenter(state: MapStoreState): MapCenter;

export function getQueryableUniqueIndexPatternIds(state: MapStoreState): string[];

export function getMapSettings(state: MapStoreState): MapSettings;

export function hasMapSettingsChanges(state: MapStoreState): boolean;

export function isUsingSearch(state: MapStoreState): boolean;

export function getSpatialFiltersLayer(state: MapStoreState): IVectorLayer;
