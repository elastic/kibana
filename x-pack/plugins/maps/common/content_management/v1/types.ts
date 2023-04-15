/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementCrudTypes, SearchOptions } from '@kbn/content-management-utils';
export type { CreateOptions, UpdateOptions } from '@kbn/content-management-utils';
import { MapContentType } from '../types';

export type MapCrudTypes = ContentManagementCrudTypes<MapContentType, MapAttributes>;

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
export type MapAttributes = {
  title: string;
  description?: string;
  mapStateJSON?: string;
  layerListJSON?: string;
  uiStateJSON?: string;
};

export type MapItem = MapCrudTypes['Item'];

// ----------- GET --------------

export type MapGetIn = MapCrudTypes['GetIn'];
export type MapGetOut = MapCrudTypes['GetOut'];

// ----------- CREATE --------------

export type MapCreateIn = MapCrudTypes['CreateIn'];
export type MapCreateOut = MapCrudTypes['CreateOut'];

// ----------- UPDATE --------------

export type MapUpdateIn = MapCrudTypes['UpdateIn'];
export type MapUpdateOut = MapCrudTypes['UpdateOut'];

// ----------- DELETE --------------

export type MapDeleteIn = MapCrudTypes['DeleteIn'];
export type MapDeleteOut = MapCrudTypes['DeleteOut'];

// ----------- SEARCH --------------

export type MapSearchIn = MapCrudTypes['SearchIn'];
export type MapSearchOut = MapCrudTypes['SearchOut'];
export type MapSearchOptions = SearchOptions;

// Might be able to factor this out, otherwise it can be added to the abstract interface
export type PartialMapItem = Omit<MapItem, 'attributes' | 'references'> & {
  attributes: Partial<MapAttributes>;
  references: Reference[] | undefined;
};

interface Reference {
  type: string;
  id: string;
  name: string;
}
