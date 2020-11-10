/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import RE2 from 're2';
import { SavedObjectsClientContract, SavedObjectsFindOptions } from 'kibana/server';
import { JobType, ML_SAVED_OBJECT_TYPE } from '../../common/types/saved_objects';
import { MLJobNotFound } from '../lib/ml_client';

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
      ...(currentSpaceOnly === true ? {} : { namespaces: ['*'] }),
      searchFields,
      filter,
    };

    const jobs = await savedObjectsClient.find<JobObject>(options);

    return jobs.saved_objects;
  }

  async function _createJob(jobType: JobType, jobId: string, datafeedId?: string) {
    await isMlReady();
    try {
      await _deleteJob(jobType, jobId);
    } catch (error) {
      // fail silently
      // the job object may or may not already exist, we'll overwrite it anyway.
    }
    await savedObjectsClient.create<JobObject>(ML_SAVED_OBJECT_TYPE, {
      job_id: jobId,
      datafeed_id: datafeedId ?? null,
      type: jobType,
    });
  }

  async function _bulkCreateJobs(jobs: JobObject[], namespaces?: string[]) {
    await isMlReady();
    return await savedObjectsClient.bulkCreate<JobObject>(
      jobs.map((j) => ({
        type: ML_SAVED_OBJECT_TYPE,
        attributes: j,
        initialNamespaces: namespaces,
      }))
    );
  }

  async function _deleteJob(jobType: JobType, jobId: string) {
    const jobs = await _getJobObjects(jobType, jobId);
    const job = jobs[0];
    if (job === undefined) {
      throw new MLJobNotFound('job not found');
    }

    await savedObjectsClient.delete(ML_SAVED_OBJECT_TYPE, job.id, { force: true });
  }

  async function createAnomalyDetectionJob(jobId: string, datafeedId?: string) {
    await _createJob('anomaly-detector', jobId, datafeedId);
  }

  async function deleteAnomalyDetectionJob(jobId: string) {
    await _deleteJob('anomaly-detector', jobId);
  }

  async function createDataFrameAnalyticsJob(jobId: string) {
    await _createJob('data-frame-analytics', jobId);
  }

  async function deleteDataFrameAnalyticsJob(jobId: string) {
    await _deleteJob('data-frame-analytics', jobId);
  }

  async function bulkCreateJobs(jobs: JobObject[], namespaces?: string[]) {
    return await _bulkCreateJobs(jobs, namespaces);
  }

  async function getAllJobObjects(jobType?: JobType, currentSpaceOnly: boolean = true) {
    return await _getJobObjects(jobType, undefined, undefined, currentSpaceOnly);
  }

  async function getAllJobObjectsForAllSpaces(jobType?: JobType) {
    await isMlReady();
    const filterObject: JobObjectFilter = {};

    if (jobType !== undefined) {
      filterObject.type = jobType;
    }

    const { filter, searchFields } = createSavedObjectFilter(filterObject);
    const options: SavedObjectsFindOptions = {
      type: ML_SAVED_OBJECT_TYPE,
      perPage: 10000,
      namespaces: ['*'],
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
    return list.filter((j) => jobIds.includes((j[field] as unknown) as string));
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

  async function assignJobsToSpaces(jobType: JobType, jobIds: string[], spaces: string[]) {
    const results: Record<string, { success: boolean; error?: any }> = {};
    const jobs = await _getJobObjects(jobType);
    for (const id of jobIds) {
      const job = jobs.find((j) => j.attributes.job_id === id);
      if (job === undefined) {
        results[id] = {
          success: false,
          error: createError(id, 'job_id'),
        };
      } else {
        try {
          await savedObjectsClient.addToNamespaces(ML_SAVED_OBJECT_TYPE, job.id, spaces);
          results[id] = {
            success: true,
          };
        } catch (error) {
          results[id] = {
            success: false,
            error,
          };
        }
      }
    }
    return results;
  }

  async function removeJobsFromSpaces(jobType: JobType, jobIds: string[], spaces: string[]) {
    const results: Record<string, { success: boolean; error?: any }> = {};
    const jobs = await _getJobObjects(jobType);
    for (const job of jobs) {
      if (jobIds.includes(job.attributes.job_id)) {
        try {
          await savedObjectsClient.deleteFromNamespaces(ML_SAVED_OBJECT_TYPE, job.id, spaces);
          results[job.attributes.job_id] = {
            success: true,
          };
        } catch (error) {
          results[job.attributes.job_id] = {
            success: false,
            error,
          };
        }
      }
    }
    return results;
  }

  return {
    getAllJobObjects,
    createAnomalyDetectionJob,
    createDataFrameAnalyticsJob,
    deleteAnomalyDetectionJob,
    deleteDataFrameAnalyticsJob,
    addDatafeed,
    deleteDatafeed,
    filterJobsForSpace,
    filterJobIdsForSpace,
    filterDatafeedsForSpace,
    filterDatafeedIdsForSpace,
    assignJobsToSpaces,
    removeJobsFromSpaces,
    bulkCreateJobs,
    getAllJobObjectsForAllSpaces,
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
