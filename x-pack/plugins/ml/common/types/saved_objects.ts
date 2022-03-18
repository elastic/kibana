/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorType } from '../util/errors';

export type JobType = 'anomaly-detector' | 'data-frame-analytics';
export type TrainedModelType = 'trained-model';
export type MlSavedObjectType = JobType | TrainedModelType;

export const ML_JOB_SAVED_OBJECT_TYPE = 'ml-job';
export const ML_TRAINED_MODEL_SAVED_OBJECT_TYPE = 'ml-trained-model';
export const ML_MODULE_SAVED_OBJECT_TYPE = 'ml-module';

export interface SavedObjectResult {
  [id: string]: { success: boolean; type: MlSavedObjectType; error?: ErrorType };
}

export type SyncResult = {
  [jobType in MlSavedObjectType]?: {
    [id: string]: { success: boolean; error?: ErrorType };
  };
};

export interface SyncSavedObjectResponse {
  savedObjectsCreated: SyncResult;
  savedObjectsDeleted: SyncResult;
  datafeedsAdded: SyncResult;
  datafeedsRemoved: SyncResult;
}

export interface CanDeleteMLSpaceAwareItemsResponse {
  [id: string]: {
    canDelete: boolean;
    canRemoveFromSpace: boolean;
  };
}

export type JobsSpacesResponse = {
  [jobType in JobType]: { [jobId: string]: string[] };
};

export interface TrainedModelsSpacesResponse {
  trainedModels: { [id: string]: string[] };
}

export interface InitializeSavedObjectResponse {
  jobs: Array<{ id: string; type: JobType }>;
  datafeeds: Array<{ id: string; type: JobType }>;
  trainedModels: Array<{ id: string }>;
  success: boolean;
  error?: ErrorType;
}

export interface SyncCheckResponse {
  result: boolean;
}

export interface DeleteMLSpaceAwareItemsCheckResponse {
  [jobId: string]: DeleteMLSpaceAwareItemsPermission;
}

export interface DeleteMLSpaceAwareItemsPermission {
  canDelete: boolean;
  canRemoveFromSpace: boolean;
}
