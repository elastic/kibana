/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HasParentApi,
  HasType,
  PublishesUnifiedSearch,
  PublishesPanelTitle,
} from '@kbn/presentation-publishing';
import {
  apiIsOfType,
  apiPublishesUnifiedSearch,
  apiPublishesPanelTitle,
} from '@kbn/presentation-publishing';
import { LensSavedObjectAttributes, ViewUnderlyingDataArgs } from '../embeddable';

export type HasLensConfig = HasType<'lens'> & {
  getSavedVis: () => Readonly<LensSavedObjectAttributes | undefined>;
  canViewUnderlyingData: () => Promise<boolean>;
  getViewUnderlyingDataArgs: () => ViewUnderlyingDataArgs;
  getFullAttributes: () => LensSavedObjectAttributes | undefined;
};

export type LensApi = HasLensConfig &
  PublishesPanelTitle &
  PublishesUnifiedSearch &
  Partial<HasParentApi<Partial<PublishesUnifiedSearch>>>;

export const isLensApi = (api: unknown): api is LensApi => {
  return Boolean(
    api &&
      apiIsOfType(api, 'lens') &&
      typeof (api as HasLensConfig).getSavedVis === 'function' &&
      typeof (api as HasLensConfig).canViewUnderlyingData === 'function' &&
      typeof (api as HasLensConfig).getViewUnderlyingDataArgs === 'function' &&
      typeof (api as HasLensConfig).getFullAttributes === 'function' &&
      apiPublishesPanelTitle(api) &&
      apiPublishesUnifiedSearch(api)
  );
};
