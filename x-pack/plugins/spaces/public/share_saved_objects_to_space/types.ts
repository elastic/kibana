/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsImportRetry, SavedObjectsImportResponse } from 'src/core/public';

export interface ShareOptions {
  selectedSpaceIds: string[];
  initiallySelectedSpaceIds: string[];
}

export type ImportRetry = Omit<SavedObjectsImportRetry, 'replaceReferences'>;

export interface ShareSavedObjectsToSpaceResponse {
  [spaceId: string]: SavedObjectsImportResponse;
}
