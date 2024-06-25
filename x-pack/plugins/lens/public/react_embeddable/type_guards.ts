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
import { LensApiCallbacks, LensApi } from './types';

function apiHasLensCallbacks(api: unknown): api is LensApiCallbacks {
  const fns = [
    'getSavedVis',
    'canViewUnderlyingData',
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
      apiHasLensCallbacks(api) &&
      apiPublishesPanelTitle(api) &&
      apiPublishesUnifiedSearch(api)
  );
};
