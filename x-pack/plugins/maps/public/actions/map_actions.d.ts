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
  MapFilters,
  MapCenterAndZoom,
  MapRefreshConfig,
} from '../../common/descriptor_types';
import { MapSettings } from '../reducers/map';

export type SyncContext = {
  startLoading(dataId: string, requestToken: symbol, meta: DataMeta): void;
  stopLoading(dataId: string, requestToken: symbol, data: unknown, meta: DataMeta): void;
  onLoadError(dataId: string, requestToken: symbol, errorMessage: string): void;
  updateSourceData(newData: unknown): void;
  isRequestStillActive(dataId: string, requestToken: symbol): boolean;
  registerCancelCallback(requestToken: symbol, callback: () => void): void;
  dataFilters: MapFilters;
};

export function updateSourceProp(
  layerId: string,
  propName: string,
  value: unknown,
  newLayerType?: LAYER_TYPE
): void;

export function setGotoWithCenter(config: MapCenterAndZoom): AnyAction;

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
  settingValue: string | boolean | number
): AnyAction;

export function cloneLayer(layerId: string): AnyAction;

export function fitToLayerExtent(layerId: string): AnyAction;

export function removeLayer(layerId: string): AnyAction;

export function toggleLayerVisible(layerId: string): AnyAction;
