/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import type { JobSavedObjectService } from './service';
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

    const allJobObjects = await jobSavedObjectService.getAllJobObjectsForAllSpaces();

    const nonSpaceADObjectIds = new Set(
      allJobObjects
        .filter(({ attributes }) => attributes.type === 'anomaly-detector')
        .map(({ attributes }) => attributes.job_id)
    );
    const nonSpaceDFAObjectIds = new Set(
      allJobObjects
        .filter(({ attributes }) => attributes.type === 'data-frame-analytics')
        .map(({ attributes }) => attributes.job_id)
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

  return { checkStatus };
}
