/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Adapters } from 'src/plugins/inspector/public';
import { AnyAction } from 'redux';

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

export function getInspectorAdapters(args: unknown): Adapters;

export function getEventHandlers(state: unknown): Partial<EventHandlers>;

export function cancelRequest(requestToken?: symbol): AnyAction;

export function registerCancelCallback(requestToken: symbol, callback: () => void): AnyAction;

export function unregisterCancelCallback(requestToken: symbol): AnyAction;
