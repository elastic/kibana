/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import { checksFactory } from '../saved_objects';

import { Job } from '../../common/types/anomaly_detection_jobs';
import { Datafeed } from '../../common/types/anomaly_detection_jobs';

interface JobStatus {
  jobId: string;
  type: string;
  datafeedId?: string;
  checks: {
    jobExists: boolean;
    datafeedExists?: boolean;
    datafeedMapped?: boolean;
  };
}

/**
 * Routes for job service
 */
export function savedObjectsRoutes({ router, mlLicense }: RouteInitialization) {
  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/force_start_datafeeds Start datafeeds
   * @apiName ForceStartDatafeeds
   * @apiDescription Starts one or more datafeeds
   *
   * @apiSchema (body) forceStartDatafeedSchema
   */
  router.get(
    {
      path: '/api/ml/saved_objects/status',
      validate: false,
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ client, mlClient, request, response, jobsInSpaces }) => {
      try {
        const { checkStatus } = checksFactory(client, jobsInSpaces);
        const savedObjects = await checkStatus();

        return response.ok({
          body: savedObjects,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobService
   *
   * @api {post} /api/ml/jobs/force_start_datafeeds Start datafeeds
   * @apiName ForceStartDatafeeds
   * @apiDescription Starts one or more datafeeds
   *
   * @apiSchema (body) forceStartDatafeedSchema
   */
  router.get(
    {
      path: '/api/ml/saved_objects/repair',
      validate: false,
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ client, mlClient, request, response, jobsInSpaces }) => {
      try {
        const { repairJobs } = checksFactory(client, jobsInSpaces);
        const savedObjects = await repairJobs();

        return response.ok({
          body: savedObjects,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
