/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorType } from '../util/errors';
export type JobType = 'anomaly-detector' | 'data-frame-analytics';
export const ML_SAVED_OBJECT_TYPE = 'ml-job';
export const ML_MODULE_SAVED_OBJECT_TYPE = 'ml-module';

export interface SavedObjectResult {
  [jobId: string]: { success: boolean; type: JobType; error?: ErrorType };
}

export interface SyncSavedObjectResponse {
  savedObjectsCreated: SavedObjectResult;
  savedObjectsDeleted: SavedObjectResult;
  datafeedsAdded: SavedObjectResult;
  datafeedsRemoved: SavedObjectResult;
}

export interface CanDeleteJobResponse {
  [jobId: string]: {
    canDelete: boolean;
    canRemoveFromSpace: boolean;
  };
}

export type JobsSpacesResponse = {
  [jobType in JobType]: { [jobId: string]: string[] };
};

export interface InitializeSavedObjectResponse {
  jobs: Array<{ id: string; type: JobType }>;
  datafeeds: Array<{ id: string; type: JobType }>;
  success: boolean;
  error?: ErrorType;
}

export interface SyncCheckResponse {
  result: boolean;
}

export interface DeleteJobCheckResponse {
  [jobId: string]: DeleteJobPermission;
}

export interface DeleteJobPermission {
  canDelete: boolean;
  canRemoveFromSpace: boolean;
}
