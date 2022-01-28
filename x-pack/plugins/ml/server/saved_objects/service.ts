/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import RE2 from 're2';
import {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
} from 'kibana/server';
import type { SecurityPluginSetup } from '../../../security/server';
import { JobType, ML_SAVED_OBJECT_TYPE } from '../../common/types/saved_objects';
import { MLJobNotFound } from '../lib/ml_client';
import { getSavedObjectClientError } from './util';
import { authorizationProvider } from './authorization';

export interface JobObject {
  job_id: string;
  datafeed_id: string | null;
  type: JobType;
}
type JobObjectFilter = { [k in keyof JobObject]?: string };

export type JobSavedObjectService = ReturnType<typeof jobSavedObjectServiceFactory>;

export function jobSavedObjectServiceFactory(
  savedObjectsClient: SavedObjectsClientContract,
  internalSavedObjectsClient: SavedObjectsClientContract,
  spacesEnabled: boolean,
  authorization: SecurityPluginSetup['authz'] | undefined,
  isMlReady: () => Promise<void>
) {
  async function _getJobObjects(
    jobType?: JobType,
    jobId?: string,
    datafeedId?: string,
    currentSpaceOnly: boolean = true
  ) {
    await isMlReady();
    const filterObject: JobObjectFilter = {};

    if (jobType !== undefined) {
      filterObject.type = jobType;
    }
    if (jobId !== undefined) {
      filterObject.job_id = jobId;
    } else if (datafeedId !== undefined) {
      filterObject.datafeed_id = datafeedId;
    }
    const { filter, searchFields } = createSavedObjectFilter(filterObject);

    const options: SavedObjectsFindOptions = {
      type: ML_SAVED_OBJECT_TYPE,
      perPage: 10000,
      ...(spacesEnabled === false || currentSpaceOnly === true ? {} : { namespaces: ['*'] }),
      searchFields,
      filter,
    };

    const jobs = await savedObjectsClient.find<JobObject>(options);

    return jobs.saved_objects;
  }

  async function _createJob(jobType: JobType, jobId: string, datafeedId?: string) {
    await isMlReady();

    const job: JobObject = {
      job_id: jobId,
      datafeed_id: datafeedId ?? null,
      type: jobType,
    };

    const id = savedObjectId(job);

    try {
      const [existingJobObject] = await getAllJobObjectsForAllSpaces(jobType, jobId);
      if (existingJobObject !== undefined) {
        // a saved object for this job already exists, this may be left over from a previously deleted job
        if (existingJobObject.namespaces?.length) {
          // use a force delete just in case the saved object exists only in another space.
          await _forceDeleteJob(jobType, jobId, existingJobObject.namespaces[0]);
        } else {
          // the saved object has no spaces, this is unexpected, attempt a normal delete
          await savedObjectsClient.delete(ML_SAVED_OBJECT_TYPE, id, { force: true });
        }
      }
    } catch (error) {
      // the saved object may exist if a previous job with the same ID has been deleted.
      // if not, this error will be throw which we ignore.
    }

    await savedObjectsClient.create<JobObject>(ML_SAVED_OBJECT_TYPE, job, {
      id,
    });
  }

  async function _bulkCreateJobs(jobs: Array<{ job: JobObject; namespaces: string[] }>) {
    await isMlReady();
    return await savedObjectsClient.bulkCreate<JobObject>(
      jobs.map((j) => ({
        type: ML_SAVED_OBJECT_TYPE,
        id: savedObjectId(j.job),
        attributes: j.job,
        initialNamespaces: j.namespaces,
      }))
    );
  }

  function savedObjectId(job: JobObject) {
    return `${job.type}-${job.job_id}`;
  }

  async function _deleteJob(jobType: JobType, jobId: string) {
    const jobs = await _getJobObjects(jobType, jobId);
    const job = jobs[0];
    if (job === undefined) {
      throw new MLJobNotFound('job not found');
    }

    await savedObjectsClient.delete(ML_SAVED_OBJECT_TYPE, job.id, { force: true });
  }

  async function _forceDeleteJob(jobType: JobType, jobId: string, namespace: string) {
    const id = savedObjectId({
      job_id: jobId,
      datafeed_id: null,
      type: jobType,
    });

    // * space cannot be used in a delete call, so use undefined which
    // is the same as specifying the default space
    await internalSavedObjectsClient.delete(ML_SAVED_OBJECT_TYPE, id, {
      namespace: namespace === '*' ? undefined : namespace,
      force: true,
    });
  }

  async function createAnomalyDetectionJob(jobId: string, datafeedId?: string) {
    await _createJob('anomaly-detector', jobId, datafeedId);
  }

  async function deleteAnomalyDetectionJob(jobId: string) {
    await _deleteJob('anomaly-detector', jobId);
  }

  async function forceDeleteAnomalyDetectionJob(jobId: string, namespace: string) {
    await _forceDeleteJob('anomaly-detector', jobId, namespace);
  }

  async function createDataFrameAnalyticsJob(jobId: string) {
    await _createJob('data-frame-analytics', jobId);
  }

  async function deleteDataFrameAnalyticsJob(jobId: string) {
    await _deleteJob('data-frame-analytics', jobId);
  }

  async function forceDeleteDataFrameAnalyticsJob(jobId: string, namespace: string) {
    await _forceDeleteJob('data-frame-analytics', jobId, namespace);
  }

  async function bulkCreateJobs(jobs: Array<{ job: JobObject; namespaces: string[] }>) {
    return await _bulkCreateJobs(jobs);
  }

  async function getAllJobObjects(jobType?: JobType, currentSpaceOnly: boolean = true) {
    return await _getJobObjects(jobType, undefined, undefined, currentSpaceOnly);
  }

  async function getJobObject(
    jobType: JobType,
    jobId: string,
    currentSpaceOnly: boolean = true
  ): Promise<SavedObjectsFindResult<JobObject> | undefined> {
    const [jobObject] = await _getJobObjects(jobType, jobId, undefined, currentSpaceOnly);
    return jobObject;
  }

  async function getAllJobObjectsForAllSpaces(jobType?: JobType, jobId?: string) {
    await isMlReady();
    const filterObject: JobObjectFilter = {};

    if (jobType !== undefined) {
      filterObject.type = jobType;
    }

    if (jobId !== undefined) {
      filterObject.job_id = jobId;
    }

    const { filter, searchFields } = createSavedObjectFilter(filterObject);
    const options: SavedObjectsFindOptions = {
      type: ML_SAVED_OBJECT_TYPE,
      perPage: 10000,
      ...(spacesEnabled === false ? {} : { namespaces: ['*'] }),
      searchFields,
      filter,
    };

    return (await internalSavedObjectsClient.find<JobObject>(options)).saved_objects;
  }

  async function addDatafeed(datafeedId: string, jobId: string) {
    const jobs = await _getJobObjects('anomaly-detector', jobId);
    const job = jobs[0];
    if (job === undefined) {
      throw new MLJobNotFound(`'${datafeedId}' not found`);
    }

    const jobObject = job.attributes;
    jobObject.datafeed_id = datafeedId;
    await savedObjectsClient.update<JobObject>(ML_SAVED_OBJECT_TYPE, job.id, jobObject);
  }

  async function deleteDatafeed(datafeedId: string) {
    const jobs = await _getJobObjects('anomaly-detector', undefined, datafeedId);
    const job = jobs[0];
    if (job === undefined) {
      throw new MLJobNotFound(`'${datafeedId}' not found`);
    }

    const jobObject = job.attributes;
    jobObject.datafeed_id = null;
    await savedObjectsClient.update<JobObject>(ML_SAVED_OBJECT_TYPE, job.id, jobObject);
  }

  async function getIds(jobType: JobType, idType: keyof JobObject) {
    const jobs = await _getJobObjects(jobType);
    return jobs.map((o) => o.attributes[idType]);
  }

  async function filterJobObjectsForSpace<T>(
    jobType: JobType,
    list: T[],
    field: keyof T,
    key: keyof JobObject
  ): Promise<T[]> {
    if (list.length === 0) {
      return [];
    }
    const jobIds = await getIds(jobType, key);
    return list.filter((j) => jobIds.includes(j[field] as unknown as string));
  }

  async function filterJobsForSpace<T>(jobType: JobType, list: T[], field: keyof T): Promise<T[]> {
    return filterJobObjectsForSpace<T>(jobType, list, field, 'job_id');
  }

  async function filterDatafeedsForSpace<T>(
    jobType: JobType,
    list: T[],
    field: keyof T
  ): Promise<T[]> {
    return filterJobObjectsForSpace<T>(jobType, list, field, 'datafeed_id');
  }

  async function filterJobObjectIdsForSpace(
    jobType: JobType,
    ids: string[],
    key: keyof JobObject,
    allowWildcards: boolean = false
  ): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    const jobIds = await getIds(jobType, key);
    // check to see if any of the ids supplied contain a wildcard
    if (allowWildcards === false || ids.join().match('\\*') === null) {
      // wildcards are not allowed or no wildcards could be found
      return ids.filter((id) => jobIds.includes(id));
    }

    // if any of the ids contain a wildcard, check each one.
    return ids.filter((id) => {
      if (id.match('\\*') === null) {
        return jobIds.includes(id);
      }
      const regex = new RE2(id.replace('*', '.*'));
      return jobIds.some((jId) => typeof jId === 'string' && regex.exec(jId));
    });
  }

  async function filterJobIdsForSpace(
    jobType: JobType,
    ids: string[],
    allowWildcards: boolean = false
  ): Promise<string[]> {
    return filterJobObjectIdsForSpace(jobType, ids, 'job_id', allowWildcards);
  }

  async function filterDatafeedIdsForSpace(
    ids: string[],
    allowWildcards: boolean = false
  ): Promise<string[]> {
    return filterJobObjectIdsForSpace('anomaly-detector', ids, 'datafeed_id', allowWildcards);
  }

  async function updateJobsSpaces(
    jobType: JobType,
    jobIds: string[],
    spacesToAdd: string[],
    spacesToRemove: string[]
  ) {
    const results: Record<string, { success: boolean; error?: any }> = {};
    const jobs = await _getJobObjects(jobType);
    const jobObjectIdMap = new Map<string, string>();
    const objectsToUpdate: Array<{ type: string; id: string }> = [];
    for (const jobId of jobIds) {
      const job = jobs.find((j) => j.attributes.job_id === jobId);
      if (job === undefined) {
        results[jobId] = {
          success: false,
          error: createError(jobId, 'job_id'),
        };
      } else {
        jobObjectIdMap.set(job.id, jobId);
        objectsToUpdate.push({ type: ML_SAVED_OBJECT_TYPE, id: job.id });
      }
    }

    try {
      const updateResult = await savedObjectsClient.updateObjectsSpaces(
        objectsToUpdate,
        spacesToAdd,
        spacesToRemove
      );
      updateResult.objects.forEach(({ id: objectId, error }) => {
        const jobId = jobObjectIdMap.get(objectId)!;
        if (error) {
          results[jobId] = {
            success: false,
            error: getSavedObjectClientError(error),
          };
        } else {
          results[jobId] = {
            success: true,
          };
        }
      });
    } catch (error) {
      // If the entire operation failed, return success: false for each job
      const clientError = getSavedObjectClientError(error);
      objectsToUpdate.forEach(({ id: objectId }) => {
        const jobId = jobObjectIdMap.get(objectId)!;
        results[jobId] = {
          success: false,
          error: clientError,
        };
      });
    }

    return results;
  }

  async function canCreateGlobalJobs(request: KibanaRequest) {
    if (authorization === undefined) {
      return true;
    }
    const { authorizationCheck } = authorizationProvider(authorization);
    return (await authorizationCheck(request)).canCreateGlobally;
  }

  return {
    getAllJobObjects,
    getJobObject,
    createAnomalyDetectionJob,
    createDataFrameAnalyticsJob,
    deleteAnomalyDetectionJob,
    forceDeleteAnomalyDetectionJob,
    deleteDataFrameAnalyticsJob,
    forceDeleteDataFrameAnalyticsJob,
    addDatafeed,
    deleteDatafeed,
    filterJobsForSpace,
    filterJobIdsForSpace,
    filterDatafeedsForSpace,
    filterDatafeedIdsForSpace,
    updateJobsSpaces,
    bulkCreateJobs,
    getAllJobObjectsForAllSpaces,
    canCreateGlobalJobs,
  };
}

export function createError(id: string, key: keyof JobObject) {
  let reason = `'${id}' not found`;
  if (key === 'job_id') {
    reason = `No known job with id '${id}'`;
  } else if (key === 'datafeed_id') {
    reason = `No known datafeed with id '${id}'`;
  }

  return {
    error: {
      reason,
    },
    status: 404,
  };
}

function createSavedObjectFilter(filterObject: JobObjectFilter) {
  const searchFields: string[] = [];
  const filter = Object.entries(filterObject)
    .map(([k, v]) => {
      searchFields.push(k);
      return `${ML_SAVED_OBJECT_TYPE}.attributes.${k}: "${v}"`;
    })
    .join(' AND ');
  return { filter, searchFields };
}
