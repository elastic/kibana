/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Service for managing job saved objects

import { useMemo } from 'react';
import { ML_INTERNAL_BASE_PATH, ML_EXTERNAL_BASE_PATH } from '../../../../common/constants/app';
import { useMlKibana } from '../../contexts/kibana';

import { HttpService } from '../http_service';

import type {
  JobType,
  MlSavedObjectType,
  CanDeleteMLSpaceAwareItemsResponse,
  SyncSavedObjectResponse,
  InitializeSavedObjectResponse,
  SavedObjectResult,
  JobsSpacesResponse,
  TrainedModelsSpacesResponse,
  SyncCheckResponse,
} from '../../../../common/types/saved_objects';

export const savedObjectsApiProvider = (httpService: HttpService) => ({
  jobsSpaces() {
    return httpService.http<JobsSpacesResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/jobs_spaces`,
      method: 'GET',
      version: '1',
    });
  },
  updateJobsSpaces(
    jobType: JobType,
    jobIds: string[],
    spacesToAdd: string[],
    spacesToRemove: string[]
  ) {
    const body = JSON.stringify({ jobType, jobIds, spacesToAdd, spacesToRemove });
    return httpService.http<SavedObjectResult>({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/update_jobs_spaces`,
      method: 'POST',
      body,
      version: '1',
    });
  },
  removeItemFromCurrentSpace(mlSavedObjectType: MlSavedObjectType, ids: string[]) {
    const body = JSON.stringify({ mlSavedObjectType, ids });
    return httpService.http<SavedObjectResult>({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/remove_item_from_current_space`,
      method: 'POST',
      body,
      version: '1',
    });
  },
  syncSavedObjects(simulate: boolean = false) {
    return httpService.http<SyncSavedObjectResponse>({
      path: `${ML_EXTERNAL_BASE_PATH}/saved_objects/sync`,
      method: 'GET',
      query: { simulate },
      version: '2023-05-15',
    });
  },
  initSavedObjects(simulate: boolean = false) {
    return httpService.http<InitializeSavedObjectResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/initialize`,
      method: 'GET',
      query: { simulate },
      version: '1',
    });
  },
  syncCheck(mlSavedObjectType?: MlSavedObjectType) {
    const body = JSON.stringify({ mlSavedObjectType });
    return httpService.http<SyncCheckResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/sync_check`,
      method: 'POST',
      body,
      version: '1',
    });
  },
  canDeleteMLSpaceAwareItems(mlSavedObjectType: MlSavedObjectType, ids: string[]) {
    const body = JSON.stringify({ ids });
    return httpService.http<CanDeleteMLSpaceAwareItemsResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/can_delete_ml_space_aware_item/${mlSavedObjectType}`,
      method: 'POST',
      body,
      version: '1',
    });
  },
  trainedModelsSpaces() {
    return httpService.http<TrainedModelsSpacesResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/trained_models_spaces`,
      method: 'GET',
      version: '1',
    });
  },
  updateModelsSpaces(modelIds: string[], spacesToAdd: string[], spacesToRemove: string[]) {
    const body = JSON.stringify({ modelIds, spacesToAdd, spacesToRemove });
    return httpService.http<SavedObjectResult>({
      path: `${ML_INTERNAL_BASE_PATH}/saved_objects/update_trained_models_spaces`,
      method: 'POST',
      body,
      version: '1',
    });
  },
});

export type SavedObjectsApiService = ReturnType<typeof savedObjectsApiProvider>;

/**
 * Hooks for accessing {@link SavedObjectsApiService} in React components.
 */
export function useSavedObjectsApiService(): SavedObjectsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => savedObjectsApiProvider(httpService), [httpService]);
}
