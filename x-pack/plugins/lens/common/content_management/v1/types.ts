/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetIn,
  CreateIn,
  SearchIn,
  UpdateIn,
  DeleteIn,
  DeleteResult,
  SearchResult,
  GetResult,
  CreateResult,
  UpdateResult,
} from '@kbn/content-management-plugin/common';

import { LensContentType } from '../types';

export interface Reference {
  type: string;
  id: string;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LensSavedObjectAttributes = {
  title: string;
  description?: string;
  visualizationType: string | null;
  state?: unknown;
};

export interface LensSavedObject {
  id: string;
  type: string;
  version?: string;
  updatedAt?: string;
  createdAt?: string;
  attributes: LensSavedObjectAttributes;
  references: Reference[];
  namespaces?: string[];
  originId?: string;
  error?: {
    error: string;
    message: string;
    statusCode: number;
    metadata?: Record<string, unknown>;
  };
}

export type PartialLensSavedObject = Omit<LensSavedObject, 'attributes' | 'references'> & {
  attributes: Partial<LensSavedObjectAttributes>;
  references: Reference[] | undefined;
};
// ----------- GET --------------

export type LensGetIn = GetIn<LensContentType>;

export type LensGetOut = GetResult<
  LensSavedObject,
  {
    outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
    aliasTargetId?: string;
    aliasPurpose?: 'savedObjectConversion' | 'savedObjectImport';
  }
>;

// ----------- CREATE --------------

export interface CreateOptions {
  /** If a document with the given `id` already exists, overwrite it's contents (default=false). */
  overwrite?: boolean;
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export type LensCreateIn = CreateIn<LensContentType, LensSavedObjectAttributes, CreateOptions>;

export type LensCreateOut = CreateResult<LensSavedObject>;

// ----------- UPDATE --------------

export interface UpdateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export type LensUpdateIn = UpdateIn<LensContentType, LensSavedObjectAttributes, UpdateOptions>;

export type LensUpdateOut = UpdateResult<PartialLensSavedObject>;

// ----------- DELETE --------------

export type LensDeleteIn = DeleteIn<LensContentType>;

export type LensDeleteOut = DeleteResult;

// ----------- SEARCH --------------

export interface LensSearchQuery {
  types?: string[];
  searchFields?: string[];
}

export type LensSearchIn = SearchIn<LensContentType, {}>;

export type LensSearchOut = SearchResult<LensSavedObject>;
