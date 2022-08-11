/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportConflictError,
  SavedObjectsImportFailure,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportResponse,
  SavedObjectsImportSuccess,
  SavedObjectsImportUnknownError,
  SavedObjectsImportUnsupportedTypeError,
} from '@kbn/core/public';

export interface FailedImport {
  obj: Omit<SavedObjectsImportFailure, 'error'>;
  error:
    | SavedObjectsImportConflictError
    | SavedObjectsImportAmbiguousConflictError
    | SavedObjectsImportUnsupportedTypeError
    | SavedObjectsImportMissingReferencesError
    | SavedObjectsImportUnknownError;
}

export interface ProcessedImportResponse {
  success: boolean;
  failedImports: FailedImport[];
  successfulImports: SavedObjectsImportSuccess[];
}

// This is derived from the function of the same name in the savedObjectsManagement plugin
export function processImportResponse(
  response: SavedObjectsImportResponse
): ProcessedImportResponse {
  const { success, errors = [], successResults = [] } = response;
  const failedImports = errors.map<FailedImport>(({ error, ...obj }) => ({ obj, error }));
  return {
    success,
    failedImports,
    successfulImports: successResults,
  };
}
