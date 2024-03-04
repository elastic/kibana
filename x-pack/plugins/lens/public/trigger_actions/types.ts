/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiIsOfType } from '@kbn/presentation-publishing';
import { HasLensConfig, ViewUnderlyingDataArgs } from '../embeddable';

export type OpenInDiscoverActionApi = HasLensConfig & {
  canViewUnderlyingData: () => Promise<boolean>;
  getViewUnderlyingDataArgs: () => ViewUnderlyingDataArgs;
};

export const isApiCompatibleWithOpenInDiscoverAction = (
  api: unknown | null
): api is OpenInDiscoverActionApi =>
  Boolean(
    apiIsOfType(api, 'lens') &&
      typeof (api as OpenInDiscoverActionApi).canViewUnderlyingData === 'function' &&
      typeof (api as OpenInDiscoverActionApi).getViewUnderlyingDataArgs === 'function'
  );
