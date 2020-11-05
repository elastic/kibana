/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { IScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import type { JobObject, JobSavedObjectService } from './service';
import { ML_SAVED_OBJECT_TYPE } from './saved_objects';
import { JobType } from '../../common/types/saved_objects';

import { Job } from '../../common/types/anomaly_detection_jobs';
import { Datafeed } from '../../common/types/anomaly_detection_jobs';
import { DataFrameAnalyticsConfig } from '../../common/types/data_frame_analytics';

interface JobSavedObjectStatus {
  jobId: string;
  type: JobType;
  datafeedId?: string | null;
  namespaces: string[] | undefined;
  checks: {
    jobExists: boolean;
    datafeedExists?: boolean;
  };
}

interface JobStatus {
  jobId: string;
  datafeedId?: string | null;
  checks: {
    savedObjectExits: boolean;
  };
}

interface SavedObjectJob {
  [ML_SAVED_OBJECT_TYPE]: {
    job_id: string;
    type: JobType;
  };
  namespaces: string[];
}

interface StatusResponse {
  savedObjects: {
    [type in JobType]: JobSavedObjectStatus[];
  };
  jobs: {
    [type in JobType]: JobStatus[];
  };
}

export function checksFactory(
  client: IScopedClusterClient,
  jobSavedObjectService: JobSavedObjectService
) {
  async function checkStatus(): Promise<StatusResponse> {
    const jobObjects = await jobSavedObjectService.getAllJobObjects(undefined, false);
    // load all non-space jobs and datafeeds
    const { body: adJobs } = await client.asInternalUser.ml.getJobs<{ jobs: Job[] }>();
    const { body: datafeeds } = await client.asInternalUser.ml.getDatafeeds<{
      datafeeds: Datafeed[];
    }>();
    const { body: dfaJobs } = await client.asInternalUser.ml.getDataFrameAnalytics<{
      data_frame_analytics: DataFrameAnalyticsConfig[];
    }>();

    const savedObjectsStatus: JobSavedObjectStatus[] = jobObjects.map(
      ({ attributes, namespaces }) => {
        const type: JobType = attributes.type;
        const jobId = attributes.job_id;
        const datafeedId = type === 'anomaly-detector' ? attributes.datafeed_id : undefined;

        let jobExists = false;
        let datafeedExists: boolean | undefined;

        if (type === 'anomaly-detector') {
          jobExists = adJobs.jobs.some((j) => j.job_id === jobId);
          datafeedExists = datafeeds.datafeeds.some((d) => d.job_id === jobId);
        } else {
          jobExists = dfaJobs.data_frame_analytics.some((j) => j.id === jobId);
        }

        return {
          jobId,
          type,
          datafeedId,
          namespaces,
          checks: {
            jobExists,
            datafeedExists,
          },
        };
      }
    );

    const nonSpaceSavedObjects = await _loadAllJobSavedObjects();
    const nonSpaceADObjectIds = new Set(
      nonSpaceSavedObjects
        .filter(({ type }) => type === 'anomaly-detector')
        .map(({ jobId }) => jobId)
    );
    const nonSpaceDFAObjectIds = new Set(
      nonSpaceSavedObjects
        .filter(({ type }) => type === 'data-frame-analytics')
        .map(({ jobId }) => jobId)
    );

    const adObjectIds = new Set(
      savedObjectsStatus.filter(({ type }) => type === 'anomaly-detector').map(({ jobId }) => jobId)
    );
    const dfaObjectIds = new Set(
      savedObjectsStatus
        .filter(({ type }) => type === 'data-frame-analytics')
        .map(({ jobId }) => jobId)
    );

    const anomalyDetectors = adJobs.jobs
      .filter(({ job_id: jobId }) => {
        // only list jobs which are in the current space (adObjectIds)
        // or are not in any spaces (nonSpaceADObjectIds)
        return adObjectIds.has(jobId) === true || nonSpaceADObjectIds.has(jobId) === false;
      })
      .map(({ job_id: jobId }) => {
        const datafeedId = datafeeds.datafeeds.find((df) => df.job_id === jobId)?.datafeed_id;
        return {
          jobId,
          datafeedId: datafeedId ?? null,
          checks: {
            savedObjectExits: nonSpaceADObjectIds.has(jobId),
          },
        };
      });

    const dataFrameAnalytics = dfaJobs.data_frame_analytics
      .filter(({ id: jobId }) => {
        // only list jobs which are in the current space (dfaObjectIds)
        // or are not in any spaces (nonSpaceDFAObjectIds)
        return dfaObjectIds.has(jobId) === true || nonSpaceDFAObjectIds.has(jobId) === false;
      })
      .map(({ id: jobId }) => {
        return {
          jobId,
          datafeedId: null,
          checks: {
            savedObjectExits: nonSpaceDFAObjectIds.has(jobId),
          },
        };
      });

    return {
      savedObjects: {
        'anomaly-detector': savedObjectsStatus.filter(({ type }) => type === 'anomaly-detector'),
        'data-frame-analytics': savedObjectsStatus.filter(
          ({ type }) => type === 'data-frame-analytics'
        ),
      },
      jobs: {
        'anomaly-detector': anomalyDetectors,
        'data-frame-analytics': dataFrameAnalytics,
      },
    };
  }

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
                error: error.body ?? error,
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
                error: error.body ?? error,
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
                error: error.body ?? error,
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
                error: error.body ?? error,
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
              results.datafeedsAdded[job.jobId] = { success: false, error };
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
              results.datafeedsRemoved[job.jobId] = { success: false, error: error.body ?? error };
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

  async function _loadAllJobSavedObjects() {
    const { body } = await client.asInternalUser.search<SearchResponse<SavedObjectJob>>({
      index: '.kibana*',
      size: 1000,
      _source: ['ml-job.job_id', 'ml-job.type', 'namespaces'],
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  type: 'ml-job',
                },
              },
            ],
          },
        },
      },
    });

    return body.hits.hits.map(({ _source }) => {
      const { job_id: jobId, type } = _source[ML_SAVED_OBJECT_TYPE];
      return {
        jobId,
        type,
        spaces: _source.namespaces,
      };
    });
  }

  return { checkStatus, repairJobs, initSavedObjects };
}
