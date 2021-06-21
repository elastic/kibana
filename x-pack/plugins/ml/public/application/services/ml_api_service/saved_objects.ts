/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Service for managing job saved objects

import { HttpService } from '../http_service';

import { basePath } from './index';
import {
  JobType,
  CanDeleteJobResponse,
  SyncSavedObjectResponse,
  InitializeSavedObjectResponse,
  SavedObjectResult,
  JobsSpacesResponse,
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
  removeJobFromCurrentSpace(jobType: JobType, jobIds: string[]) {
    const body = JSON.stringify({ jobType, jobIds });
    return httpService.http<SavedObjectResult>({
      path: `${basePath()}/saved_objects/remove_job_from_current_space`,
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
  canDeleteJob(jobType: JobType, jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<CanDeleteJobResponse>({
      path: `${basePath()}/saved_objects/can_delete_job/${jobType}`,
      method: 'POST',
      body,
    });
  },
});
