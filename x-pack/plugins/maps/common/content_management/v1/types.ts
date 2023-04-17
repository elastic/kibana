/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetIn,
  GetResult,
  CreateIn,
  CreateResult,
  SearchIn,
  SearchResult,
  UpdateIn,
  UpdateResult,
  DeleteIn,
  DeleteResult,
} from '@kbn/content-management-plugin/common';
import { MapContentType } from '../types';

interface Reference {
  type: string;
  id: string;
  name: string;
}

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
export type MapAttributes = {
  title: string;
  description?: string;
  mapStateJSON?: string;
  layerListJSON?: string;
  uiStateJSON?: string;
};

export interface MapItem {
  id: string;
  type: string;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
  error?: {
    error: string;
    message: string;
    statusCode: number;
    metadata?: Record<string, unknown>;
  };
  attributes: MapAttributes;
  references: Reference[];
  namespaces?: string[];
  originId?: string;
}

export type PartialMapItem = Omit<MapItem, 'attributes' | 'references'> & {
  attributes: Partial<MapAttributes>;
  references: Reference[] | undefined;
};

// ----------- GET --------------

export type MapGetIn = GetIn<MapContentType>;

export type MapGetOut = GetResult<
  MapItem,
  {
    outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
    aliasTargetId?: string;
    aliasPurpose?: 'savedObjectConversion' | 'savedObjectImport';
  }
>;

// ----------- CREATE --------------

export interface CreateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export type MapCreateIn = CreateIn<MapContentType, MapAttributes, CreateOptions>;

export type MapCreateOut = CreateResult<MapItem>;

// ----------- UPDATE --------------

export interface UpdateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export type MapUpdateIn = UpdateIn<MapContentType, MapAttributes, UpdateOptions>;

export type MapUpdateOut = UpdateResult<PartialMapItem>;

// ----------- DELETE --------------

export type MapDeleteIn = DeleteIn<MapContentType>;

export type MapDeleteOut = DeleteResult;

// ----------- SEARCH --------------

export interface MapSearchOptions {
  /** Flag to indicate to only search the text on the "title" field */
  onlyTitle?: boolean;
}

export type MapSearchIn = SearchIn<MapContentType, MapSearchOptions>;

export type MapSearchOut = SearchResult<MapItem>;
