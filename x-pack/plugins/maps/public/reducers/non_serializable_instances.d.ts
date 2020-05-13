/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Adapters } from 'src/plugins/inspector/public';
import { AnyAction } from 'redux';

interface EventHandlers {
  /**
   * Take action on data load.
   */
  onDataLoad: (layerId: string, dataId: string) => void;
  /**
   * Take action on data load end.
   */
  onDataLoadEnd: (layerId: string, dataId: string, resultMeta: object) => void;
  /**
   * Take action on data load error.
   */
  onDataLoadError: (layerId: string, dataId: string, errorMessage: string) => void;
}

export function setEventHandlers(eventHandlers?: EventHandlers): AnyAction;

export function getInspectorAdapters(args: unknown): Adapters;
