/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { JobsInSpaces, JobType } from './filter';
import { ML_SAVED_OBJECT_TYPE } from './saved_objects';

import { Job } from '../../common/types/anomaly_detection_jobs';
import { Datafeed } from '../../common/types/anomaly_detection_jobs';
import { DataFrameAnalyticsConfig } from '../../common/types/data_frame_analytics';

interface JobStatus {
  jobId: string;
  type: JobType;
  datafeedId?: string | null;
  checks: {
    jobExists: boolean;
    datafeedExists?: boolean;
    datafeedMapped?: boolean;
  };
}

interface SavedObjectJob {
  [ML_SAVED_OBJECT_TYPE]: {
    job_id: string;
    type: JobType;
  };
  namespaces: string[];
}

export function checksFactory(client: IScopedClusterClient, jobsInSpaces: JobsInSpaces) {
  async function checkStatus() {
    const { saved_objects: jobObjects } = await jobsInSpaces.getAllJobObjects();
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

    const { body: adJobs } = await client.asInternalUser.ml.getJobs<{ jobs: Job[] }>();
    const { body: datafeeds } = await client.asInternalUser.ml.getDatafeeds<{
      datafeeds: Datafeed[];
    }>();
    const { body: dfaJobs } = await client.asInternalUser.ml.getDataFrameAnalytics<{
      data_frame_analytics: DataFrameAnalyticsConfig[];
    }>();

    const savedObjects: JobStatus[] = jobObjects.map(({ attributes }) => {
      const type: JobType = attributes.type;
      const jobId = attributes.job_id;
      const datafeedId = type === 'anomaly-detector' ? attributes.datafeed_id : undefined;

      let jobExists = false;
      let datafeedExists: boolean | undefined;
      let datafeedMapped: boolean | undefined;

      if (type === 'anomaly-detector') {
        jobExists = adJobs.jobs.some((j) => j.job_id === jobId);
        datafeedExists = datafeeds.datafeeds.some((j) => j.job_id === jobId);
        datafeedMapped = datafeeds.datafeeds.some((j) => j.datafeed_id === datafeedId);
      } else {
        jobExists = dfaJobs.data_frame_analytics.some((j) => j.id === jobId);
      }

      return {
        jobId,
        type,
        datafeedId,
        checks: {
          jobExists,
          datafeedExists,
          datafeedMapped,
        },
      };
    });

    const anomalyDetectors = adJobs.jobs.map(({ job_id: jobId }) => {
      const datafeedId = datafeeds.datafeeds.find((df) => df.job_id === jobId)?.datafeed_id;
      return {
        jobId,
        datafeedId: datafeedId ?? null,
        checks: {
          savedObjectExits: nonSpaceADObjectIds.has(jobId),
        },
      };
    });

    const dataFrameAnalytics = dfaJobs.data_frame_analytics.map(({ id: jobId }) => {
      return {
        jobId,
        checks: {
          savedObjectExits: nonSpaceDFAObjectIds.has(jobId),
        },
      };
    });

    return {
      savedObjects: {
        anomalyDetectors: savedObjects.filter(({ type }) => type === 'anomaly-detector'),
        dataFrameAnalytics: savedObjects.filter(({ type }) => type === 'data-frame-analytics'),
      },
      jobs: {
        anomalyDetectors,
        dataFrameAnalytics,
      },
    };
  }

  async function repairJobs(simulate: boolean = false) {
    const results: {
      savedObjectsCreated: string[];
      savedObjectsDeleted: string[];
      datafeedsCreated: string[];
      datafeedsDeleted: string[];
    } = {
      savedObjectsCreated: [],
      savedObjectsDeleted: [],
      datafeedsCreated: [],
      datafeedsDeleted: [],
    };

    const status = await checkStatus();
    for (const job of status.jobs.anomalyDetectors) {
      if (job.checks.savedObjectExits === false) {
        results.savedObjectsCreated.push(job.jobId);
        if (simulate === false) {
          await jobsInSpaces.createAnomalyDetectionJob(job.jobId);
          if (job.datafeedId !== null) {
            //
            await jobsInSpaces.addDatafeed(job.datafeedId, job.jobId);
          }
        }
      }
    }
    for (const job of status.jobs.dataFrameAnalytics) {
      if (job.checks.savedObjectExits === false) {
        results.savedObjectsCreated.push(job.jobId);
        if (simulate === false) {
          //
          await jobsInSpaces.createDataFrameAnalyticsJob(job.jobId);
        }
      }
    }

    for (const job of status.savedObjects.anomalyDetectors) {
      if (job.checks.jobExists === false) {
        results.savedObjectsDeleted.push(job.jobId);
        if (simulate === false) {
          //
          await jobsInSpaces.deleteAnomalyDetectionJob(job.jobId);
        }
      }
    }
    for (const job of status.savedObjects.dataFrameAnalytics) {
      if (job.checks.jobExists === false) {
        results.savedObjectsDeleted.push(job.jobId);
        if (simulate === false) {
          //
          await jobsInSpaces.deleteDataFrameAnalyticsJob(job.jobId);
        }
      }
    }

    for (const job of status.savedObjects.anomalyDetectors) {
      if (job.checks.datafeedExists === true && job.checks.datafeedMapped === false) {
        //
        results.datafeedsCreated.push(job.jobId);
      } else if (job.checks.datafeedExists === false && job.checks.datafeedMapped === true) {
        //
        results.datafeedsDeleted.push(job.jobId);
      }
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

  return { checkStatus, repairJobs };
}
