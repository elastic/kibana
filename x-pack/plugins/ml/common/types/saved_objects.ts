/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type JobType = 'anomaly-detector' | 'data-frame-analytics';
export const ML_SAVED_OBJECT_TYPE = 'ml-job';

export interface SavedObjectResult {
  [jobId: string]: { success: boolean; error?: any };
}

export interface SyncSavedObjectResponse {
  savedObjectsCreated: SavedObjectResult;
  savedObjectsDeleted: SavedObjectResult;
  datafeedsAdded: SavedObjectResult;
  datafeedsRemoved: SavedObjectResult;
}

export type JobsSpacesResponse = {
  [jobType in JobType]: { [jobId: string]: string[] };
};

export interface InitializeSavedObjectResponse {
  jobs: Array<{ id: string; type: string }>;
  success: boolean;
  error?: any;
}

export interface DeleteJobCheckResponse {
  [jobId: string]: DeleteJobPermission;
}

export interface DeleteJobPermission {
  canDelete: boolean;
  canUntag: boolean;
}
