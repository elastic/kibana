/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsImportRetry, SavedObjectsImportResponse } from 'src/core/public';
import { Space } from '..';

export interface ShareOptions {
  selectedSpaceIds: string[];
}

export type ImportRetry = Omit<SavedObjectsImportRetry, 'replaceReferences'>;

export interface ShareSavedObjectsToSpaceResponse {
  [spaceId: string]: SavedObjectsImportResponse;
}

export interface SpaceTarget extends Space {
  isActiveSpace: boolean;
}
