/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import { checksFactory } from '../saved_objects';

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
    mlLicense.fullLicenseAPIGuard(
      async ({ client, mlClient, request, response, jobSavedObjectService }) => {
        try {
          const { checkStatus } = checksFactory(client, jobSavedObjectService);
          const status = await checkStatus();

          return response.ok({
            body: status,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    )
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
      validate: {
        query: schema.object({ simulate: schema.maybe(schema.boolean()) }),
      },
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    mlLicense.fullLicenseAPIGuard(
      async ({ client, mlClient, request, response, jobSavedObjectService }) => {
        try {
          const { simulate } = request.query;
          const { repairJobs } = checksFactory(client, jobSavedObjectService);
          const savedObjects = await repairJobs(simulate);

          return response.ok({
            body: savedObjects,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    )
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
  router.post(
    {
      path: '/api/ml/saved_objects/assign_job_to_space',
      validate: {
        body: schema.object({
          jobType: schema.string(),
          jobIds: schema.arrayOf(schema.string()),
          spaces: schema.arrayOf(schema.string()),
        }),
      },
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ request, response, jobSavedObjectService }) => {
      try {
        const { jobType, jobIds, spaces } = request.body;

        const body = await jobSavedObjectService.assignJobsToSpaces(jobType, jobIds, spaces);

        return response.ok({
          body,
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
  router.post(
    {
      path: '/api/ml/saved_objects/remove_job_from_space',
      validate: {
        body: schema.object({
          jobType: schema.string(),
          jobIds: schema.arrayOf(schema.string()),
          spaces: schema.arrayOf(schema.string()),
        }),
      },
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ request, response, jobSavedObjectService }) => {
      try {
        const { jobType, jobIds, spaces } = request.body;

        const body = await jobSavedObjectService.removeJobsFromSpaces(jobType, jobIds, spaces);

        return response.ok({
          body,
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
      path: '/api/ml/saved_objects/jobs_spaces',
      validate: false,
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ response, jobSavedObjectService, client }) => {
      try {
        const { checkStatus } = checksFactory(client, jobSavedObjectService);
        const allStatuses = Object.values((await checkStatus()).savedObjects).flat();

        const body = allStatuses
          .filter((s) => s.checks.jobExists)
          .reduce((acc, cur) => {
            const type = cur.type;
            if (acc[type] === undefined) {
              acc[type] = {};
            }
            acc[type][cur.jobId] = cur.namespaces;
            return acc;
          }, {} as { [id: string]: { [id: string]: string[] | undefined } });

        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
