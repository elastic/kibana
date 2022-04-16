/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Adapters } from '@kbn/inspector-plugin/public';
import { AnyAction } from 'redux';
import { MapStoreState } from './store';

export type NonSerializableState = {
  inspectorAdapters: Adapters;
  cancelRequestCallbacks: Map<symbol, () => {}>; // key is request token, value is cancel callback
  eventHandlers: Partial<EventHandlers>;
  chartsPaletteServiceGetColor: (value: string) => string | null;
};

export interface ResultMeta {
  featuresCount?: number;
}

interface EventHandlers {
  /**
   * Take action on data load.
   */
  onDataLoad: ({ layerId, dataId }: { layerId: string; dataId: string }) => void;
  /**
   * Take action on data load end.
   */
  onDataLoadEnd: ({
    layerId,
    dataId,
    resultMeta,
  }: {
    layerId: string;
    dataId: string;
    resultMeta: ResultMeta;
  }) => void;
  /**
   * Take action on data load error.
   */
  onDataLoadError: ({
    layerId,
    dataId,
    errorMessage,
  }: {
    layerId: string;
    dataId: string;
    errorMessage: string;
  }) => void;
}

export function setEventHandlers(eventHandlers?: EventHandlers): AnyAction;

export function getInspectorAdapters(state: MapStoreState): Adapters;

export function getEventHandlers(state: MapStoreState): Partial<EventHandlers>;

export function getChartsPaletteServiceGetColor(
  state: MapStoreState
): (value: string) => string | null;

export function setChartsPaletteServiceGetColor(
  chartsPaletteServiceGetColor: ((value: string) => string) | null
): AnyAction;

export function cancelRequest(requestToken?: symbol): AnyAction;

export function registerCancelCallback(requestToken: symbol, callback: () => void): AnyAction;

export function unregisterCancelCallback(requestToken: symbol): AnyAction;
