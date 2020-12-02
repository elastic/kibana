/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface UsageStats {
  'apiCalls.copySavedObjects.total'?: number;
  'apiCalls.copySavedObjects.kibanaRequest.yes'?: number;
  'apiCalls.copySavedObjects.kibanaRequest.no'?: number;
  'apiCalls.copySavedObjects.createNewCopiesEnabled.yes'?: number;
  'apiCalls.copySavedObjects.createNewCopiesEnabled.no'?: number;
  'apiCalls.copySavedObjects.overwriteEnabled.yes'?: number;
  'apiCalls.copySavedObjects.overwriteEnabled.no'?: number;
  'apiCalls.resolveCopySavedObjectsErrors.total'?: number;
  'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.yes'?: number;
  'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.no'?: number;
  'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.yes'?: number;
  'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.no'?: number;
}
