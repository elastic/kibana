/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsCollectMultiNamespaceReferencesObject } from 'kibana/server';
import type { Space } from 'src/plugins/spaces_oss/common';

export interface GetAllSpacesOptions {
  purpose?: GetAllSpacesPurpose;
  includeAuthorizedPurposes?: boolean;
}

export type GetAllSpacesPurpose =
  | 'any'
  | 'copySavedObjectsIntoSpace'
  | 'findSavedObjects'
  | 'shareSavedObjectsIntoSpace';

export interface GetSpaceResult extends Space {
  authorizedPurposes?: Record<GetAllSpacesPurpose, boolean>;
}

export interface GetShareableReferencesResponse {
  /** The count of references that are not tags */
  relativesCount: number;
  /** The count of references that are tags */
  tagsCount: number;
  /** The spaces that are selected (all objects are in these spaces) */
  selectedSpaces: string[];
  /** The spaces that are partially selected (some -- but not all -- objects are in these spaces) */
  partiallySelectedSpaces: string[];
  /** The spaces that are unknown */
  unknownSpacesCount: number;
  /** The references that were found, with additional context -- including the input objects */
  objects: SavedObjectsCollectMultiNamespaceReferencesObject[];
}
