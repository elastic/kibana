/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import moment from 'moment';
import type { ReportingCore } from '../..';
import { CSV_SEARCHSOURCE_IMMEDIATE_TYPE } from '../../../common/constants';
import { runTaskFnFactory } from '../../export_types/csv_searchsource_immediate/execute_job';
import type { JobParamsDownloadCSV } from '../../export_types/csv_searchsource_immediate/types';
import { PassThroughStream } from '../../lib';
import { authorizedUserPreRouting, getCounters } from '../lib';

const API_BASE_URL_V1 = '/api/reporting/v1';
const API_BASE_GENERATE_V1 = `${API_BASE_URL_V1}/generate`;

export type CsvFromSavedObjectRequest = KibanaRequest<unknown, unknown, JobParamsDownloadCSV>;

const path = `${API_BASE_GENERATE_V1}/immediate/csv_searchsource`;

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
  parentLogger: Logger
) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  // TODO: find a way to abstract this using ExportTypeRegistry: it needs a new
  // public method to return this array
  // const registry = reporting.getExportTypesRegistry();
  // const kibanaAccessControlTags = registry.getAllAccessControlTags();
  const useKibanaAccessControl = reporting.getDeprecatedAllowedRoles() === false; // true if deprecated config is turned off
  const kibanaAccessControlTags = useKibanaAccessControl ? ['access:downloadCsv'] : [];

  // This API calls run the SearchSourceImmediate export type's runTaskFn directly
  router.post(
    {
      path,
      validate: {
        body: schema.object({
          columns: schema.maybe(schema.arrayOf(schema.string())),
          searchSource: schema.object({}, { unknowns: 'allow' }),
          browserTimezone: schema.string({
            defaultValue: 'UTC',
            validate: (value) =>
              moment.tz.zone(value) ? undefined : `Invalid timezone "${typeof value}".`,
          }),
          title: schema.string(),
          version: schema.maybe(schema.string()),
        }),
      },
      options: {
        tags: kibanaAccessControlTags,
      },
    },
    authorizedUserPreRouting(
      reporting,
      async (user, context, req: CsvFromSavedObjectRequest, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        const logger = parentLogger.get(CSV_SEARCHSOURCE_IMMEDIATE_TYPE);
        const runTaskFn = runTaskFnFactory(reporting, logger);
        const stream = new PassThroughStream();
        const eventLog = reporting.getEventLogger({
          jobtype: CSV_SEARCHSOURCE_IMMEDIATE_TYPE,
          created_by: user && user.username,
          payload: { browserTimezone: req.body.browserTimezone },
        });
        const logError = (error: Error) => {
          logger.error(error);
          eventLog.logError(error);
        };

        try {
          eventLog.logExecutionStart();
          const taskPromise = runTaskFn(null, req.body, context, stream, req)
            .then((output) => {
              logger.info(`Job output size: ${stream.bytesWritten} bytes.`);

              if (!stream.bytesWritten) {
                logger.warn('CSV Job Execution created empty content result');
              }

              eventLog.logExecutionComplete({
                ...(output.metrics ?? {}),
                byteSize: stream.bytesWritten,
              });
            })
            .finally(() => stream.end());

          await Promise.race([stream.firstBytePromise, taskPromise]);

          taskPromise.catch(logError);

          counters.usageCounter();

          return res.ok({
            body: stream,
            headers: {
              'content-type': 'text/csv;charset=utf-8',
              'accept-ranges': 'none',
            },
          });
        } catch (error) {
          logError(error);

          if (error instanceof Boom.Boom) {
            const statusCode = error.output.statusCode;
            counters.errorCounter(undefined, statusCode);

            return res.customError({
              statusCode,
              body: error.output.payload.message,
            });
          }

          counters.errorCounter(undefined, 500);

          return res.customError({
            statusCode: 500,
          });
        }
      }
    )
  );
}
