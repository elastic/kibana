/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { IScopedClusterClient } from 'kibana/server';
import type { JobObject, JobSavedObjectService } from './service';
import {
  JobType,
  SyncSavedObjectResponse,
  InitializeSavedObjectResponse,
} from '../../common/types/saved_objects';
import { checksFactory } from './checks';
import type { JobStatus } from './checks';
import { getSavedObjectClientError } from './util';

import { Datafeed } from '../../common/types/anomaly_detection_jobs';

export interface JobSpaceOverrides {
  overrides: {
    [type in JobType]: { [jobId: string]: string[] };
  };
}

export function syncSavedObjectsFactory(
  client: IScopedClusterClient,
  jobSavedObjectService: JobSavedObjectService
) {
  const { checkStatus } = checksFactory(client, jobSavedObjectService);

  async function syncSavedObjects(simulate: boolean = false) {
    const results: SyncSavedObjectResponse = {
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

    const adJobsById = status.jobs['anomaly-detector'].reduce((acc, j) => {
      acc[j.jobId] = j;
      return acc;
    }, {} as Record<string, JobStatus>);

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
          const { jobId, namespaces } = job;
          tasks.push(async () => {
            try {
              if (namespaces !== undefined && namespaces.length) {
                await jobSavedObjectService.forceDeleteAnomalyDetectionJob(jobId, namespaces[0]);
              } else {
                await jobSavedObjectService.deleteAnomalyDetectionJob(jobId);
              }
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
          const { jobId, namespaces } = job;
          tasks.push(async () => {
            try {
              if (namespaces !== undefined && namespaces.length) {
                await jobSavedObjectService.forceDeleteDataFrameAnalyticsJob(jobId, namespaces[0]);
              } else {
                await jobSavedObjectService.deleteDataFrameAnalyticsJob(jobId);
              }
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
      if (
        (job.checks.datafeedExists === true && job.datafeedId === null) ||
        (job.checks.datafeedExists === false &&
          job.datafeedId === null &&
          job.checks.datafeedExists === false &&
          adJobsById[job.jobId] &&
          adJobsById[job.jobId].datafeedId !== job.datafeedId)
      ) {
        // add datafeed id for jobs where the datafeed exists but the id is missing from the saved object
        // or if the datafeed id in the saved object is not the same as the one attached to the job in es
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

  async function initSavedObjects(
    simulate: boolean = false,
    spaceOverrides?: JobSpaceOverrides
  ): Promise<InitializeSavedObjectResponse> {
    const results: InitializeSavedObjectResponse = {
      jobs: [],
      success: true,
    };
    const status = await checkStatus();

    const jobs: Array<{ job: JobObject; namespaces: string[] }> = [];
    const types: JobType[] = ['anomaly-detector', 'data-frame-analytics'];

    types.forEach((type) => {
      status.jobs[type].forEach((job) => {
        if (job.checks.savedObjectExits === false) {
          if (simulate === true) {
            results.jobs.push({ id: job.jobId, type });
          } else {
            jobs.push({
              job: {
                job_id: job.jobId,
                datafeed_id: job.datafeedId ?? null,
                type,
              },
              // allow some jobs to be assigned to specific spaces when initializing
              namespaces: spaceOverrides?.overrides[type][job.jobId] ?? ['*'],
            });
          }
        }
      });
    });

    try {
      const createResults = await jobSavedObjectService.bulkCreateJobs(jobs);
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

  return { checkStatus, syncSavedObjects, initSavedObjects };
}
