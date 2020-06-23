/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { get } from 'lodash';
import { HandlerErrorFunction, HandlerFunction, QueuedJobPayload } from './types';
import { ReportingCore } from '../';
import { API_BASE_GENERATE_V1, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../common/constants';
import { getJobParamsFromRequest } from '../export_types/csv_from_savedobject/server/lib/get_job_params_from_request';
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';

/*
 * This function registers API Endpoints for queuing Reporting jobs. The API inputs are:
 * - saved object type and ID
 * - time range and time zone
 * - application state:
 *     - filters
 *     - query bar
 *     - local (transient) changes the user made to the saved object
 */
export function registerGenerateCsvFromSavedObject(
  reporting: ReportingCore,
  handleRoute: HandlerFunction,
  handleRouteError: HandlerErrorFunction
) {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const { router } = setupDeps;
  router.post(
    {
      path: `${API_BASE_GENERATE_V1}/csv/saved-object/{savedObjectType}:{savedObjectId}`,
      validate: {
        params: schema.object({
          savedObjectType: schema.string({ minLength: 2 }),
          savedObjectId: schema.string({ minLength: 2 }),
        }),
        body: schema.object({
          state: schema.object({}),
          timerange: schema.object({
            timezone: schema.string({ defaultValue: 'UTC' }),
            min: schema.nullable(schema.oneOf([schema.number(), schema.string({ minLength: 5 })])),
            max: schema.nullable(schema.oneOf([schema.number(), schema.string({ minLength: 5 })])),
          }),
        }),
      },
    },
    userHandler(async (user, context, req, res) => {
      /*
       * 1. Build `jobParams` object: job data that execution will need to reference in various parts of the lifecycle
       * 2. Pass the jobParams and other common params to `handleRoute`, a shared function to enqueue the job with the params
       * 3. Ensure that details for a queued job were returned
       */
      let result: QueuedJobPayload<any>;
      try {
        const jobParams = getJobParamsFromRequest(req, { isImmediate: false });
        result = await handleRoute(
          user,
          CSV_FROM_SAVEDOBJECT_JOB_TYPE,
          jobParams,
          context,
          req,
          res
        );
      } catch (err) {
        return handleRouteError(res, err);
      }

      if (get(result, 'source.job') == null) {
        return res.badRequest({
          body: `The Export handler is expected to return a result with job info! ${result}`,
        });
      }

      return res.ok({
        body: result,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );
}
