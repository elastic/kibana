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
import { MapContentType } from '../types';

export type MapCrudTypes = ContentManagementCrudTypes<
  MapContentType,
  MapAttributes,
  Pick<SavedObjectCreateOptions, 'references'>,
  Pick<SavedObjectUpdateOptions, 'references'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  }
>;

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
export type MapAttributes = {
  title: string;
  description?: string;
  mapStateJSON?: string;
  layerListJSON?: string;
  uiStateJSON?: string;
};

export type MapItem = MapCrudTypes['Item'];
export type PartialMapItem = MapCrudTypes['PartialItem'];

// ----------- GET --------------

export type MapGetIn = MapCrudTypes['GetIn'];
export type MapGetOut = MapCrudTypes['GetOut'];

// ----------- CREATE --------------

export type MapCreateIn = MapCrudTypes['CreateIn'];
export type MapCreateOut = MapCrudTypes['CreateOut'];
export type MapCreateOptions = MapCrudTypes['CreateOptions'];

// ----------- UPDATE --------------

export type MapUpdateIn = MapCrudTypes['UpdateIn'];
export type MapUpdateOut = MapCrudTypes['UpdateOut'];
export type MapUpdateOptions = MapCrudTypes['UpdateOptions'];

// ----------- DELETE --------------

export type MapDeleteIn = MapCrudTypes['DeleteIn'];
export type MapDeleteOut = MapCrudTypes['DeleteOut'];

// ----------- SEARCH --------------

export type MapSearchIn = MapCrudTypes['SearchIn'];
export type MapSearchOut = MapCrudTypes['SearchOut'];
export type MapSearchOptions = MapCrudTypes['SearchOptions'];
