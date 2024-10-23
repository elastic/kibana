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
import type { ContentManagementCrudTypes } from '@kbn/content-management-utils';

import { GraphContentType } from '../types';

export interface Reference {
  type: string;
  id: string;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type GraphSavedObjectAttributes = {
  title: string;
  description?: string;
  version?: number;
  numVertices: number;
  numLinks: number;
  wsState?: string;
  kibanaSavedObjectMeta?: unknown;
  legacyIndexPatternRef: string;
};

export interface GraphSavedObject {
  id: string;
  type: string;
  version?: string;
  updatedAt?: string;
  createdAt?: string;
  attributes: GraphSavedObjectAttributes;
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

export type PartialGraphSavedObject = Omit<GraphSavedObject, 'attributes' | 'references'> & {
  attributes: Partial<GraphSavedObjectAttributes>;
  references: Reference[] | undefined;
};
// ----------- GET --------------

export type GraphGetIn = GetIn<GraphContentType>;

export type GraphGetOut = GetResult<
  GraphSavedObject,
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

export type GraphCreateIn = CreateIn<GraphContentType, GraphSavedObjectAttributes, CreateOptions>;

export type GraphCreateOut = CreateResult<GraphSavedObject>;

// ----------- UPDATE --------------

export interface UpdateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export type GraphUpdateIn = UpdateIn<GraphContentType, GraphSavedObjectAttributes, UpdateOptions>;

export type GraphUpdateOut = UpdateResult<PartialGraphSavedObject>;

// ----------- DELETE --------------

export type GraphDeleteIn = DeleteIn<GraphContentType>;

export type GraphDeleteOut = DeleteResult;

// ----------- SEARCH --------------

export interface GraphSearchQuery {
  types?: string[];
  searchFields?: string[];
}

export type GraphSearchIn = SearchIn<GraphContentType, {}>;

export type GraphSearchOut = SearchResult<GraphSavedObject>;

// ----------- CRUD TYPES --------------

export type GraphCrudTypes = ContentManagementCrudTypes<
  GraphContentType,
  GraphSavedObjectAttributes,
  CreateOptions,
  UpdateOptions,
  {}
>;
