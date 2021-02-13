/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsImportRetry, SavedObjectsImportResponse } from 'src/core/public';

export interface CopyOptions {
  includeRelated: boolean;
  createNewCopies: boolean;
  overwrite: boolean;
  selectedSpaceIds: string[];
}

export type ImportRetry = Omit<SavedObjectsImportRetry, 'replaceReferences'>;

export interface CopySavedObjectsToSpaceResponse {
  [spaceId: string]: SavedObjectsImportResponse;
}

export interface SavedObjectTarget {
  /**
   * The object's type.
   */
  type: string;
  /**
   * The object's ID.
   */
  id: string;
  /**
   * The namespaces that the object currently exists in.
   */
  namespaces: string[];
  /**
   * The EUI icon that is rendered in the flyout's subtitle.
   *
   * Default is 'apps'.
   */
  icon?: string;
  /**
   * The string that is rendered in the flyout's subtitle.
   *
   * Default is `${type} [id=${id}]`.
   */
  title?: string;
}
