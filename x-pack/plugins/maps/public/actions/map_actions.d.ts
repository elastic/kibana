/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Filter, Query, TimeRange } from 'src/plugins/data/public';
import { AnyAction } from 'redux';
import { LAYER_TYPE } from '../../common/constants';
import {
  DataMeta,
  LayerDescriptor,
  MapFilters,
  MapCenterAndZoom,
  MapRefreshConfig,
  MapExtent,
} from '../../common/descriptor_types';
import { MapSettings } from '../reducers/map';

export function updateSourceProp(
  layerId: string,
  propName: string,
  value: unknown,
  newLayerType?: LAYER_TYPE
): void;

export function setGotoWithCenter(config: MapCenterAndZoom): AnyAction;
export function setGotoWithBounds(config: MapExtent): AnyAction;

export function fitToDataBounds(): AnyAction;

export function replaceLayerList(layerList: unknown[]): AnyAction;

export type QueryGroup = {
  filters: Filter[];
  query?: Query;
  timeFilters?: TimeRange;
  refresh?: boolean;
};

export function setQuery(query: QueryGroup): AnyAction;

export function setRefreshConfig(config: MapRefreshConfig): AnyAction;

export function disableScrollZoom(): AnyAction;

export function disableInteractive(): AnyAction;

export function disableTooltipControl(): AnyAction;

export function hideToolbarOverlay(): AnyAction;

export function hideLayerControl(): AnyAction;

export function hideViewControl(): AnyAction;

export function setHiddenLayers(hiddenLayerIds: string[]): AnyAction;

export function addLayerWithoutDataSync(layerDescriptor: unknown): AnyAction;

export function setMapSettings(settings: MapSettings): AnyAction;

export function rollbackMapSettings(): AnyAction;

export function trackMapSettings(): AnyAction;

export function updateMapSetting(
  settingKey: string,
  settingValue: string | boolean | number | object
): AnyAction;

export function cloneLayer(layerId: string): AnyAction;

export function fitToLayerExtent(layerId: string): AnyAction;

export function removeLayer(layerId: string): AnyAction;

export function toggleLayerVisible(layerId: string): AnyAction;

export function clearTransientLayerStateAndCloseFlyout(): AnyAction;

export function setTransientLayer(layerId: string | null): AnyAction;

export function removeTransientLayer(): AnyAction;

export function addLayer(layerDescriptor: LayerDescriptor): AnyAction;

export function setSelectedLayer(layerId: string | null): AnyAction;
