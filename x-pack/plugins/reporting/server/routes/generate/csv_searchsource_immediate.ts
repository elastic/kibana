/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { KibanaRequest } from 'src/core/server';
import { PassThrough } from 'stream';
import { ReportingCore } from '../../';
import { CSV_SEARCHSOURCE_IMMEDIATE_TYPE } from '../../../common/constants';
import { runTaskFnFactory } from '../../export_types/csv_searchsource_immediate/execute_job';
import { JobParamsDownloadCSV } from '../../export_types/csv_searchsource_immediate/types';
import { LevelLogger as Logger } from '../../lib';
import { BaseParams } from '../../types';
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
        const eventLog = reporting.getEventLogger({
          jobtype: CSV_SEARCHSOURCE_IMMEDIATE_TYPE,
          created_by: user && user.username,
          payload: { browserTimezone: (req.params as BaseParams).browserTimezone },
        });

        const stream = new (class extends PassThrough {
          private onFirstByte?(): void;

          bytesWritten = 0;
          firstBytePromise = new Promise<void>((resolve) => {
            this.onFirstByte = resolve;
          });

          _write(
            chunk: Buffer | string,
            encoding: BufferEncoding,
            callback: (error?: Error | null) => void
          ) {
            const size = Buffer.isBuffer(chunk) ? chunk.byteLength : chunk.length;

            if (!this.bytesWritten && size) {
              this.onFirstByte?.();
            }
            this.bytesWritten += size;

            return super._write(chunk, encoding, callback);
          }
        })();

        const logError = (error: Error) => {
          logger.error(error);
          eventLog.logError(error);
        };

        try {
          eventLog.logExecutionStart();
          const taskPromise = runTaskFn(null, req.body, context, stream, req)
            .then(() => {
              logger.info(`Job output size: ${stream.bytesWritten} bytes.`);

              if (!stream.bytesWritten) {
                logger.warn('CSV Job Execution created empty content result');
              }

              eventLog.logExecutionComplete({ byteSize: stream.bytesWritten });
            })
            .finally(() => stream.end());

          await Promise.race([stream.firstBytePromise, taskPromise]);

          taskPromise.catch(logError);

          return res.ok({
            body: stream,
            headers: {
              'content-type': 'text/csv;charset=utf-8',
              'accept-ranges': 'none',
            },
          });
        } catch (error) {
          logError(error);

          return requestHandler.handleError(error);
        }
      }
    )
  );
}
