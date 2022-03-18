/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Service for managing job saved objects

import { useMemo } from 'react';
import { useMlKibana } from '../../contexts/kibana';

import { HttpService } from '../http_service';

import { basePath } from './index';
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
      path: `${basePath()}/saved_objects/jobs_spaces`,
      method: 'GET',
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
      path: `${basePath()}/saved_objects/update_jobs_spaces`,
      method: 'POST',
      body,
    });
  },
  removeItemFromCurrentSpace(mlSavedObjectType: MlSavedObjectType, ids: string[]) {
    const body = JSON.stringify({ mlSavedObjectType, ids });
    return httpService.http<SavedObjectResult>({
      path: `${basePath()}/saved_objects/remove_item_from_current_space`,
      method: 'POST',
      body,
    });
  },
  syncSavedObjects(simulate: boolean = false) {
    return httpService.http<SyncSavedObjectResponse>({
      path: `${basePath()}/saved_objects/sync`,
      method: 'GET',
      query: { simulate },
    });
  },
  initSavedObjects(simulate: boolean = false) {
    return httpService.http<InitializeSavedObjectResponse>({
      path: `${basePath()}/saved_objects/initialize`,
      method: 'GET',
      query: { simulate },
    });
  },
  syncCheck(mlSavedObjectType?: MlSavedObjectType) {
    const body = JSON.stringify({ mlSavedObjectType });
    return httpService.http<SyncCheckResponse>({
      path: `${basePath()}/saved_objects/sync_check`,
      method: 'POST',
      body,
    });
  },
  canDeleteMLSpaceAwareItems(mlSavedObjectType: MlSavedObjectType, ids: string[]) {
    const body = JSON.stringify({ ids });
    return httpService.http<CanDeleteMLSpaceAwareItemsResponse>({
      path: `${basePath()}/saved_objects/can_delete_ml_space_aware_item/${mlSavedObjectType}`,
      method: 'POST',
      body,
    });
  },
  trainedModelsSpaces() {
    return httpService.http<TrainedModelsSpacesResponse>({
      path: `${basePath()}/saved_objects/trained_models_spaces`,
      method: 'GET',
    });
  },
  updateModelsSpaces(modelIds: string[], spacesToAdd: string[], spacesToRemove: string[]) {
    const body = JSON.stringify({ modelIds, spacesToAdd, spacesToRemove });
    return httpService.http<SavedObjectResult>({
      path: `${basePath()}/saved_objects/update_trained_models_spaces`,
      method: 'POST',
      body,
    });
  },
});

type SavedObjectsApiService = ReturnType<typeof savedObjectsApiProvider>;

/**
 * Hooks for accessing {@link TrainedModelsApiService} in React components.
 */
export function useSavedObjectsApiService(): SavedObjectsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => savedObjectsApiProvider(httpService), [httpService]);
}
