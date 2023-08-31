/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import { LensContentType } from '../types';

export type LensCrudTypes = ContentManagementCrudTypes<
  LensContentType,
  LensSavedObjectAttributes,
  Pick<SavedObjectCreateOptions, 'overwrite' | 'references'>,
  Pick<SavedObjectUpdateOptions, 'overwrite' | 'references'>,
  LensSearchQuery
>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LensSavedObjectAttributes = {
  title: string;
  description?: string;
  visualizationType: string | null;
  state?: unknown;
};

export type LensSavedObject = LensCrudTypes['Item'];
export type PartialLensSavedObject = LensCrudTypes['PartialItem'];

export interface LensSearchQuery {
  types?: string[];
  searchFields?: string[];
}
