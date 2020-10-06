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
      validate: {
        query: schema.object({ simulate: schema.maybe(schema.boolean()) }),
      },
      options: {
        tags: ['access:ml:canStartStopDatafeed'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ client, mlClient, request, response, jobsInSpaces }) => {
      try {
        const { simulate } = request.query;
        const { repairJobs } = checksFactory(client, jobsInSpaces);
        const savedObjects = await repairJobs(simulate);

        return response.ok({
          body: savedObjects,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
