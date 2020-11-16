/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { IScopedClusterClient } from 'kibana/server';
import type { JobObject, JobSavedObjectService } from './service';
import { JobType } from '../../common/types/saved_objects';
import { checksFactory } from './checks';
import { getSavedObjectClientError } from './util';

import { Datafeed } from '../../common/types/anomaly_detection_jobs';

export function repairFactory(
  client: IScopedClusterClient,
  jobSavedObjectService: JobSavedObjectService
) {
  const { checkStatus } = checksFactory(client, jobSavedObjectService);

  async function repairJobs(simulate: boolean = false) {
    type Result = Record<string, { success: boolean; error?: any }>;
    const results: {
      savedObjectsCreated: Result;
      savedObjectsDeleted: Result;
      datafeedsAdded: Result;
      datafeedsRemoved: Result;
    } = {
      savedObjectsCreated: {},
      savedObjectsDeleted: {},
      datafeedsAdded: {},
      datafeedsRemoved: {},
    };

    const { body: datafeeds } = await client.asInternalUser.ml.getDatafeeds<{
      datafeeds: Datafeed[];
    }>();

    const tasks: Array<() => Promise<void>> = [];

    const status = await checkStatus();
    for (const job of status.jobs['anomaly-detector']) {
      if (job.checks.savedObjectExits === false) {
        if (simulate === true) {
          results.savedObjectsCreated[job.jobId] = { success: true };
        } else {
          // create AD saved objects for jobs which are missing them
          const jobId = job.jobId;
          const datafeedId = job.datafeedId;
          tasks.push(async () => {
            try {
              await jobSavedObjectService.createAnomalyDetectionJob(jobId, datafeedId ?? undefined);
              results.savedObjectsCreated[job.jobId] = { success: true };
            } catch (error) {
              results.savedObjectsCreated[job.jobId] = {
                success: false,
                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }
    for (const job of status.jobs['data-frame-analytics']) {
      if (job.checks.savedObjectExits === false) {
        if (simulate === true) {
          results.savedObjectsCreated[job.jobId] = { success: true };
        } else {
          // create DFA saved objects for jobs which are missing them
          const jobId = job.jobId;
          tasks.push(async () => {
            try {
              await jobSavedObjectService.createDataFrameAnalyticsJob(jobId);
              results.savedObjectsCreated[job.jobId] = { success: true };
            } catch (error) {
              results.savedObjectsCreated[job.jobId] = {
                success: false,
                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }

    for (const job of status.savedObjects['anomaly-detector']) {
      if (job.checks.jobExists === false) {
        if (simulate === true) {
          results.savedObjectsDeleted[job.jobId] = { success: true };
        } else {
          // Delete AD saved objects for jobs which no longer exist
          const jobId = job.jobId;
          tasks.push(async () => {
            try {
              await jobSavedObjectService.deleteAnomalyDetectionJob(jobId);
              results.savedObjectsDeleted[job.jobId] = { success: true };
            } catch (error) {
              results.savedObjectsDeleted[job.jobId] = {
                success: false,
                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }
    for (const job of status.savedObjects['data-frame-analytics']) {
      if (job.checks.jobExists === false) {
        if (simulate === true) {
          results.savedObjectsDeleted[job.jobId] = { success: true };
        } else {
          // Delete DFA saved objects for jobs which no longer exist
          const jobId = job.jobId;
          tasks.push(async () => {
            try {
              await jobSavedObjectService.deleteDataFrameAnalyticsJob(jobId);
              results.savedObjectsDeleted[job.jobId] = { success: true };
            } catch (error) {
              results.savedObjectsDeleted[job.jobId] = {
                success: false,
                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }

    for (const job of status.savedObjects['anomaly-detector']) {
      if (job.checks.datafeedExists === true && job.datafeedId === null) {
        // add datafeed id for jobs where the datafeed exists but the id is missing from the saved object
        if (simulate === true) {
          results.datafeedsAdded[job.jobId] = { success: true };
        } else {
          const df = datafeeds.datafeeds.find((d) => d.job_id === job.jobId);
          const jobId = job.jobId;
          const datafeedId = df?.datafeed_id;

          tasks.push(async () => {
            try {
              if (datafeedId !== undefined) {
                await jobSavedObjectService.addDatafeed(datafeedId, jobId);
              }
              results.datafeedsAdded[job.jobId] = { success: true };
            } catch (error) {
              results.datafeedsAdded[job.jobId] = {
                success: false,
                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      } else if (
        job.checks.jobExists === true &&
        job.checks.datafeedExists === false &&
        job.datafeedId !== null &&
        job.datafeedId !== undefined
      ) {
        // remove datafeed id for jobs where the datafeed no longer exists but the id is populated in the saved object
        if (simulate === true) {
          results.datafeedsRemoved[job.jobId] = { success: true };
        } else {
          const datafeedId = job.datafeedId;
          tasks.push(async () => {
            try {
              await jobSavedObjectService.deleteDatafeed(datafeedId);
              results.datafeedsRemoved[job.jobId] = { success: true };
            } catch (error) {
              results.datafeedsRemoved[job.jobId] = {
                success: false,
                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }
    await Promise.allSettled(tasks.map((t) => t()));
    return results;
  }

  async function initSavedObjects(simulate: boolean = false, namespaces: string[] = ['*']) {
    const results: { jobs: Array<{ id: string; type: string }>; success: boolean; error?: any } = {
      jobs: [],
      success: true,
    };
    const status = await checkStatus();

    const jobs: JobObject[] = [];
    const types: JobType[] = ['anomaly-detector', 'data-frame-analytics'];

    types.forEach((type) => {
      status.jobs[type].forEach((job) => {
        if (job.checks.savedObjectExits === false) {
          if (simulate === true) {
            results.jobs.push({ id: job.jobId, type });
          } else {
            jobs.push({
              job_id: job.jobId,
              datafeed_id: job.datafeedId ?? null,
              type,
            });
          }
        }
      });
    });
    try {
      const createResults = await jobSavedObjectService.bulkCreateJobs(jobs, namespaces);
      createResults.saved_objects.forEach(({ attributes }) => {
        results.jobs.push({
          id: attributes.job_id,
          type: attributes.type,
        });
      });
    } catch (error) {
      results.success = false;
      results.error = Boom.boomify(error).output;
    }
    return results;
  }

  return { checkStatus, repairJobs, initSavedObjects };
}
