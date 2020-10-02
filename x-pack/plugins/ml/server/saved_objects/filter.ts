/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
// import Boom from 'boom';
import { ML_SAVED_OBJECT_TYPE } from './saved_objects';

export type JobType = 'anomaly-detector' | 'data-frame-analytics';

interface JobObject {
  job_id: string;
  datafeed_id: string | null | undefined;
  type: JobType;
}

export type JobsInSpaces = ReturnType<typeof filterJobIdsFactory>;

export function filterJobIdsFactory(savedObjectsClient: SavedObjectsClientContract) {
  async function getJobObjects(jobType: JobType, jobId?: string, datafeedId?: string) {
    const options = {
      type: ML_SAVED_OBJECT_TYPE,
      searchFields: ['type'],
      search: `type: ${jobType}`,
      perPage: 10000,
    };

    if (jobId !== undefined) {
      options.searchFields.push('job_id');
      options.search += ` AND job_id: ${jobId} `;
    } else if (datafeedId !== undefined) {
      options.searchFields.push('datafeed_id');
      options.search += ` AND datafeed_id: ${datafeedId} `;
    }

    return await savedObjectsClient.find<JobObject>(options);
  }

  async function _createJob(jobType: JobType, jobId: string) {
    await savedObjectsClient.create<JobObject>(ML_SAVED_OBJECT_TYPE, {
      job_id: jobId,
      datafeed_id: null,
      type: jobType,
    });
  }

  async function _deleteJob(jobType: JobType, jobId: string) {
    const jobs = await getJobObjects(jobType, jobId);
    const job = jobs.saved_objects[0];
    if (job === undefined) {
      throw new Error('job not found');
    }

    await savedObjectsClient.delete(ML_SAVED_OBJECT_TYPE, job.id);
  }

  async function createAnomalyDetectionJob(jobId: string) {
    await _createJob('anomaly-detector', jobId);
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

  async function addDatafeed(datafeedId: string, jobId: string) {
    const jobs = await getJobObjects('anomaly-detector', jobId);
    const job = jobs.saved_objects[0];
    if (job === undefined) {
      throw new Error('job not found');
    }

    const jobObject = job.attributes;
    jobObject.datafeed_id = datafeedId;
    await savedObjectsClient.update<JobObject>(ML_SAVED_OBJECT_TYPE, job.id, jobObject);
  }

  async function deleteDatafeed(datafeedId: string) {
    const jobs = await getJobObjects('anomaly-detector', undefined, datafeedId);
    const job = jobs.saved_objects[0];
    if (job === undefined) {
      throw new Error('job not found');
    }

    const jobObject = job.attributes;
    jobObject.datafeed_id = null;
    await savedObjectsClient.update<JobObject>(ML_SAVED_OBJECT_TYPE, job.id, jobObject);
  }

  async function getIds(jobType: JobType, idType: keyof JobObject) {
    const jobs = await getJobObjects(jobType);
    return jobs.saved_objects.map((o) => o.attributes[idType]);
  }

  async function filterJobObjectsForSpace<T>(
    jobType: JobType,
    list: T[],
    field: keyof T,
    key: keyof JobObject
  ): Promise<T[]> {
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
    key: keyof JobObject
  ): Promise<string[]> {
    const jobIds = await getIds(jobType, key);
    return ids.filter((id) => jobIds.includes(id));
  }

  async function filterJobIdsForSpace(jobType: JobType, ids: string[]): Promise<string[]> {
    return filterJobObjectIdsForSpace(jobType, ids, 'job_id');
  }

  async function filterDatafeedIdsForSpace(ids: string[]): Promise<string[]> {
    return filterJobObjectIdsForSpace('anomaly-detector', ids, 'datafeed_id');
  }

  async function jobsExists(jobType: JobType, ids: string[]) {
    const existIds = await filterJobObjectIdsForSpace(jobType, ids, 'job_id');
    return ids.map((id) =>
      existIds.includes(id)
        ? { exists: true }
        : { exists: false, error: { body: createError(id, 'job_id') } }
    );
  }

  async function jobExists(jobType: JobType, id: string) {
    const exists = await jobsExists(jobType, [id]);
    if (exists[0].exists === false) {
      // throw exists[0].error;
      throw new Error(exists[0].error?.body.error.reason);
    }
  }

  return {
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
    jobsExists,
    jobExists,
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
