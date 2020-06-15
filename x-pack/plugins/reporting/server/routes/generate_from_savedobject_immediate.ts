/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ReportingCore } from '../';
import { API_BASE_GENERATE_V1 } from '../../common/constants';
import { scheduleTaskFnFactory } from '../export_types/csv_from_savedobject/server/create_job';
import { runTaskFnFactory } from '../export_types/csv_from_savedobject/server/execute_job';
import { getJobParamsFromRequest } from '../export_types/csv_from_savedobject/server/lib/get_job_params_from_request';
import { ScheduledTaskParamsPanelCsv } from '../export_types/csv_from_savedobject/types';
import { LevelLogger as Logger } from '../lib';
import { TaskRunResult } from '../types';
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';
import { HandlerErrorFunction } from './types';

/*
 * This function registers API Endpoints for immediate Reporting jobs. The API inputs are:
 * - saved object type and ID
 * - time range and time zone
 * - application state:
 *     - filters
 *     - query bar
 *     - local (transient) changes the user made to the saved object
 */
export function registerGenerateCsvFromSavedObjectImmediate(
  reporting: ReportingCore,
  handleError: HandlerErrorFunction,
  parentLogger: Logger
) {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const { router } = setupDeps;

  /*
   * CSV export with the `immediate` option does not queue a job with Reporting's ESQueue to run the job async. Instead, this does:
   *  - re-use the scheduleTask function to build up es query config
   *  - re-use the runTask function to run the scan and scroll queries and capture the entire CSV in a result object.
   */
  router.post(
    {
      path: `${API_BASE_GENERATE_V1}/immediate/csv/saved-object/{savedObjectType}:{savedObjectId}`,
      validate: {
        params: schema.object({
          savedObjectType: schema.string({ minLength: 5 }),
          savedObjectId: schema.string({ minLength: 5 }),
        }),
        body: schema.object({
          state: schema.object({}, { unknowns: 'allow' }),
          timerange: schema.object({
            timezone: schema.string({ defaultValue: 'UTC' }),
            min: schema.nullable(schema.oneOf([schema.number(), schema.string({ minLength: 5 })])),
            max: schema.nullable(schema.oneOf([schema.number(), schema.string({ minLength: 5 })])),
          }),
        }),
      },
    },
    userHandler(async (user, context, req, res) => {
      const logger = parentLogger.clone(['savedobject-csv']);
      const jobParams = getJobParamsFromRequest(req, { isImmediate: true });
      const scheduleTaskFn = scheduleTaskFnFactory(reporting, logger);
      const runTaskFn = runTaskFnFactory(reporting, logger);

      try {
        const jobDocPayload: ScheduledTaskParamsPanelCsv = await scheduleTaskFn(
          jobParams,
          req.headers,
          context,
          req
        );
        const {
          content_type: jobOutputContentType,
          content: jobOutputContent,
          size: jobOutputSize,
        }: TaskRunResult = await runTaskFn(null, jobDocPayload, context, req);

        logger.info(`Job output size: ${jobOutputSize} bytes`);

        /*
         * ESQueue worker function defaults `content` to null, even if the
         * runTask returned undefined.
         *
         * This converts null to undefined so the value can be sent to h.response()
         */
        if (jobOutputContent === null) {
          logger.warn('CSV Job Execution created empty content result');
        }

        return res.ok({
          body: jobOutputContent || '',
          headers: {
            'content-type': jobOutputContentType,
            'accept-ranges': 'none',
          },
        });
      } catch (err) {
        return handleError(res, err);
      }
    })
  );
}
