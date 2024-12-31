/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiIsOfType,
  apiPublishesPanelTitle,
  apiPublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { isObject } from 'lodash';
import {
  LensApiCallbacks,
  LensApi,
  LensComponentForwardedProps,
  LensPublicCallbacks,
} from './types';

function apiHasLensCallbacks(api: unknown): api is LensApiCallbacks {
  const fns = [
    'getSavedVis',
    'getViewUnderlyingDataArgs',
    'isTextBasedLanguage',
    'getTextBasedLanguage',
  ] as Array<keyof LensApiCallbacks>;
  return fns.every((fn) => typeof (api as LensApiCallbacks)[fn] === 'function');
}

export const isLensApi = (api: unknown): api is LensApi => {
  return Boolean(
    api &&
      apiIsOfType(api, 'lens') &&
      'canViewUnderlyingData$' in api &&
      apiHasLensCallbacks(api) &&
      apiPublishesPanelTitle(api) &&
      apiPublishesUnifiedSearch(api)
  );
};

export function apiHasLensComponentCallbacks(api: unknown): api is LensPublicCallbacks {
  return (
    isObject(api) &&
    ['onFilter', 'onBrushEnd', 'onLoad', 'onTableRowClick', 'onBeforeBadgesRender'].some((fn) =>
      Object.hasOwn(api, fn)
    )
  );
}

export function apiHasLensComponentProps(api: unknown): api is LensComponentForwardedProps {
  return (
    isObject(api) &&
    ['style', 'className', 'noPadding', 'viewMode', 'abortController'].some((prop) =>
      Object.hasOwn(api, prop)
    )
  );
}

export function apiHasAbortController(api: unknown): api is { abortController: AbortController } {
  return isObject(api) && Object.hasOwn(api, 'abortController');
}

export function apiHasLastReloadRequestTime(
  api: unknown
): api is { lastReloadRequestTime: number } {
  return isObject(api) && Object.hasOwn(api, 'lastReloadRequestTime');
}

export function apiPublishesInlineEditingCapabilities(
  api: unknown
): api is { canEditInline: boolean } {
  return isObject(api) && Object.hasOwn(api, 'canEditInline');
}
