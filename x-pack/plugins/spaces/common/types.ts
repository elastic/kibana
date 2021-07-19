/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Space } from 'src/plugins/spaces_oss/common';

/**
 * Controls how spaces are retrieved.
 */
export interface GetAllSpacesOptions {
  /**
   * An optional purpose describing how the set of spaces will be used.
   * The default purpose (`any`) will retrieve all spaces the user is authorized to see,
   * whereas a more specific purpose will retrieve all spaces the user is authorized to perform a specific action within.
   *
   * @see GetAllSpacesPurpose
   */
  purpose?: GetAllSpacesPurpose;

  /**
   * Set to true to return a set of flags indicating which purposes the user is authorized for.
   *
   * @see GetAllSpacesPurpose
   */
  includeAuthorizedPurposes?: boolean;
}

/**
 * The set of purposes to retrieve spaces:
 * - `any`: retrieves all spaces the user is authorized to see.
 * - `copySavedObjectsIntoSpace`: retrieves all spaces the user is authorized to copy saved objects into.
 * - `findSavedObjects`: retrieves all spaces the user is authorized to search within.
 * - `shareSavedObjectsIntoSpace`: retrieves all spaces the user is authorized to share saved objects into.
 */
export type GetAllSpacesPurpose =
  | 'any'
  | 'copySavedObjectsIntoSpace'
  | 'findSavedObjects'
  | 'shareSavedObjectsIntoSpace';

/**
 * Response format when querying for spaces.
 */
export interface GetSpaceResult extends Space {
  /**
   * A set of flags indicating which purposes the user is authorized for.
   */
  authorizedPurposes?: Record<GetAllSpacesPurpose, boolean>;
}

/**
 * Client interface for interacting with legacy URL aliases.
 */
export interface LegacyUrlAliasTarget {
  /**
   * The namespace that the object existed in when it was converted.
   */
  targetSpace: string;
  /**
   * The type of the object when it was converted.
   */
  targetType: string;
  /**
   * The original ID of the object, before it was converted.
   */
  sourceId: string;
}
