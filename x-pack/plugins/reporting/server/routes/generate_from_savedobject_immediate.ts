/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { KibanaRequest } from 'src/core/server';
import { ReportingCore } from '../';
import { createJobFnFactory } from '../export_types/csv_from_savedobject/create_job';
import { runTaskFnFactory } from '../export_types/csv_from_savedobject/execute_job';
import {
  JobParamsPanelCsv,
  JobParamsPanelCsvPost,
} from '../export_types/csv_from_savedobject/types';
import { LevelLogger as Logger } from '../lib';
import { TaskRunResult } from '../lib/tasks';
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';
import { getJobParamsFromRequest } from './lib/get_job_params_from_request';
import { HandlerErrorFunction } from './types';

const API_BASE_URL_V1 = '/api/reporting/v1';
const API_BASE_GENERATE_V1 = `${API_BASE_URL_V1}/generate`;

export type CsvFromSavedObjectRequest = KibanaRequest<
  JobParamsPanelCsv,
  unknown,
  JobParamsPanelCsvPost
>;

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
   *  - re-use the createJob function to build up es query config
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
    userHandler(async (user, context, req: CsvFromSavedObjectRequest, res) => {
      const logger = parentLogger.clone(['savedobject-csv']);
      const jobParams = getJobParamsFromRequest(req);
      const createJob = createJobFnFactory(reporting, logger);
      const runTaskFn = runTaskFnFactory(reporting, logger);

      try {
        // FIXME: no create job for immediate download
        const payload = await createJob(jobParams, context, req);
        const {
          content_type: jobOutputContentType,
          content: jobOutputContent,
          size: jobOutputSize,
        }: TaskRunResult = await runTaskFn(null, payload, context, req);

        logger.info(`Job output size: ${jobOutputSize} bytes`);

        // convert null to undefined so the value can be sent to h.response()
        if (jobOutputContent === null) {
          logger.warn('CSV Job Execution created empty content result');
        }

        return res.ok({
          body: jobOutputContent || '',
          headers: {
            'content-type': jobOutputContentType ? jobOutputContentType : [],
            'accept-ranges': 'none',
          },
        });
      } catch (err) {
        logger.error(err);
        return handleError(res, err);
      }
    })
  );
}
