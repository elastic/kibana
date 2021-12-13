/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { KibanaRequest } from 'src/core/server';
import { Writable } from 'stream';
import uuid from 'uuid';
import { ReportingCore } from '../../';
import { IEvent } from '../../../../event_log/server';
import { CSV_SEARCHSOURCE_IMMEDIATE_TYPE } from '../../../common/constants';
import { runTaskFnFactory } from '../../export_types/csv_searchsource_immediate/execute_job';
import { JobParamsDownloadCSV } from '../../export_types/csv_searchsource_immediate/types';
import { LevelLogger as Logger } from '../../lib';
import { TaskRunResult } from '../../lib/tasks';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';
import { RequestHandler } from '../lib/request_handler';

const API_BASE_URL_V1 = '/api/reporting/v1';
const API_BASE_GENERATE_V1 = `${API_BASE_URL_V1}/generate`;

export type CsvFromSavedObjectRequest = KibanaRequest<unknown, unknown, JobParamsDownloadCSV>;

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
      path: `${API_BASE_GENERATE_V1}/immediate/csv_searchsource`,
      validate: {
        body: schema.object({
          columns: schema.maybe(schema.arrayOf(schema.string())),
          searchSource: schema.object({}, { unknowns: 'allow' }),
          browserTimezone: schema.string({ defaultValue: 'UTC' }),
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
        const logger = parentLogger.clone([CSV_SEARCHSOURCE_IMMEDIATE_TYPE]);
        const runTaskFn = runTaskFnFactory(reporting, logger);
        const requestHandler = new RequestHandler(reporting, user, context, req, res, logger);

        const downloadEvent: IEvent = {
          user: { name: user ? user.username : undefined },
          event: { id: uuid.v1(), timezone: req.body.browserTimezone, kind: 'event' },
          log: { level: 'info' },
          kibana: {
            reporting: { jobtype: CSV_SEARCHSOURCE_IMMEDIATE_TYPE, status: 'processing' },
          },
        };
        const [{ startLogger, completeLogger, errorLogger }, createEventLog] =
          reporting.getEventLoggers(downloadEvent);
        startLogger.logEvent(createEventLog({ message: 'Started generating CSV output' }));
        completeLogger.startTiming(downloadEvent);

        try {
          let buffer = Buffer.from('');
          const stream = new Writable({
            write(chunk, encoding, callback) {
              buffer = Buffer.concat([
                buffer,
                Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
              ]);
              callback();
            },
          });

          const { content_type: jobOutputContentType }: TaskRunResult = await runTaskFn(
            null,
            req.body,
            context,
            stream,
            req
          );
          stream.end();
          const jobOutputContent = buffer.toString();
          const jobOutputSize = buffer.byteLength;

          logger.info(`Job output size: ${jobOutputSize} bytes.`);

          // convert null to undefined so the value can be sent to h.response()
          if (jobOutputContent === null) {
            logger.warn('CSV Job Execution created empty content result');
          }

          completeLogger.stopTiming(downloadEvent);
          completeLogger.logEvent(
            createEventLog({
              message: 'Finished generating CSV output',
              event: { kind: 'metric' },
              kibana: {
                reporting: {
                  status: 'completed',
                  csv: { byteLength: jobOutputSize },
                },
              },
            })
          );

          return res.ok({
            body: jobOutputContent || '',
            headers: {
              'content-type': jobOutputContentType ? jobOutputContentType : [],
              'accept-ranges': 'none',
            },
          });
        } catch (err) {
          logger.error(err);
          errorLogger.logEvent(
            createEventLog({
              message: `${err}`,
              log: { level: 'error' },
              kibana: { reporting: { status: 'error' } },
              event: { kind: 'error' },
              error: {
                message: err.message,
                code: err.code,
                stack_trace: err.stack_trace,
                type: err.type,
              },
            })
          );
          return requestHandler.handleError(err);
        }
      }
    )
  );
}
