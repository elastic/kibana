/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { IdFormat, JobType } from '../../../../common/http_api/latest';
import { getJobId } from '../../../../common/log_analysis';
import { callDeleteJobs, callGetJobDeletionTasks, callStopDatafeeds } from './api/ml_cleanup';

export const cleanUpJobsAndDatafeeds = async <T extends JobType>(
  spaceId: string,
  logViewId: string,
  idFormat: IdFormat,
  jobTypes: T[],
  fetch: HttpHandler
) => {
  try {
    await callStopDatafeeds({ spaceId, logViewId, idFormat, jobTypes }, fetch);
  } catch (err) {
    // Proceed only if datafeed has been deleted or didn't exist in the first place
    if (err?.response?.status !== 404) {
      throw err;
    }
  }

  return await deleteJobs(spaceId, logViewId, idFormat, jobTypes, fetch);
};

const deleteJobs = async <T extends JobType>(
  spaceId: string,
  logViewId: string,
  idFormat: IdFormat,
  jobTypes: T[],
  fetch: HttpHandler
) => {
  const deleteJobsResponse = await callDeleteJobs(
    { spaceId, logViewId, idFormat, jobTypes },
    fetch
  );
  await waitUntilJobsAreDeleted(spaceId, logViewId, idFormat, jobTypes, fetch);
  return deleteJobsResponse;
};

const waitUntilJobsAreDeleted = async <T extends JobType>(
  spaceId: string,
  logViewId: string,
  idFormat: IdFormat,
  jobTypes: T[],
  fetch: HttpHandler
) => {
  const moduleJobIds = jobTypes.map((jobType) => getJobId(spaceId, logViewId, idFormat, jobType));
  while (true) {
    const { jobs } = await callGetJobDeletionTasks(fetch);
    const needToWait = jobs
      .flatMap((job) => Object.keys(job))
      .some((jobId) => moduleJobIds.includes(jobId));

    if (needToWait) {
      await timeout(1000);
    } else {
      return true;
    }
  }
};

const timeout = (ms: number) => new Promise((res) => setTimeout(res, ms));
