/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HasParentApi,
  HasType,
  PublishesLocalUnifiedSearch,
  PublishesPanelTitle,
} from '@kbn/presentation-publishing';
import { apiIsOfType } from '@kbn/presentation-publishing';
import { LensSavedObjectAttributes } from '../embeddable';

export type HasLensConfig = HasType<'lens'> & {
  getSavedVis: () => Readonly<LensSavedObjectAttributes | undefined>;
};

export type LensApi = HasLensConfig &
  PublishesPanelTitle &
  PublishesLocalUnifiedSearch &
  Partial<HasParentApi<unknown>>;

export const apiHasLensConfig = (api: unknown): api is LensApi => {
  return Boolean(
    api && apiIsOfType(api, 'lens') && typeof (api as HasLensConfig).getSavedVis === 'function'
  );
};
