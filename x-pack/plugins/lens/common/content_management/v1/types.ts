/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateIn } from '@kbn/content-management-plugin/common';
import type { ContentManagementCrudTypes } from '@kbn/content-management-utils';

import type { LensContentType } from '../types';

export interface Reference {
  type: string;
  id: string;
  name: string;
}

export interface CreateOptions {
  /** If a document with the given `id` already exists, overwrite it's contents (default=false). */
  overwrite?: boolean;
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export interface UpdateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export interface LensSearchQuery {
  searchFields?: string[];
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LensSavedObjectAttributes = {
  title: string;
  description?: string;
  visualizationType: string | null;
  state?: unknown;
};

// Need to handle update in Lens in a bit different way
export type LensCrudTypes = Omit<
  ContentManagementCrudTypes<
    LensContentType,
    LensSavedObjectAttributes,
    CreateOptions,
    UpdateOptions,
    LensSearchQuery
  >,
  'UpdateIn'
> & { UpdateIn: UpdateIn<LensContentType, LensSavedObjectAttributes, UpdateOptions> };

export type LensSavedObject = LensCrudTypes['Item'];
export type PartialLensSavedObject = LensCrudTypes['PartialItem'];

// ----------- GET --------------

export type LensGetIn = LensCrudTypes['GetIn'];

export type LensGetOut = LensCrudTypes['GetOut'];

// ----------- CREATE --------------

export type LensCreateIn = LensCrudTypes['CreateIn'];

export type LensCreateOut = LensCrudTypes['CreateOut'];
// ----------- UPDATE --------------

export type LensUpdateIn = LensCrudTypes['UpdateIn'];
export type LensUpdateOut = LensCrudTypes['UpdateOut'];
// ----------- DELETE --------------

export type LensDeleteIn = LensCrudTypes['DeleteIn'];
export type LensDeleteOut = LensCrudTypes['DeleteOut'];
// ----------- SEARCH --------------

export type LensSearchIn = LensCrudTypes['SearchIn'];
export type LensSearchOut = LensCrudTypes['SearchOut'];
