/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { CONTENT_TYPE_CSV, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../../common/constants';
import { cryptoFactory } from '../../../lib';
import { RunTaskFnFactory, ScheduledTaskParams, TaskRunResult } from '../../../types';
import { CsvResultFromSearch } from '../../csv/types';
import { FakeRequest, JobParamsPanelCsv, SearchPanel } from '../types';
import { createGenerateCsv } from './lib';

/*
 * ImmediateExecuteFn receives the job doc payload because the payload was
 * generated in the ScheduleFn
 */
export type ImmediateExecuteFn<JobParamsType> = (
  jobId: null,
  job: ScheduledTaskParams<JobParamsType>,
  context: RequestHandlerContext,
  req: KibanaRequest
) => Promise<TaskRunResult>;

export const runTaskFnFactory: RunTaskFnFactory<ImmediateExecuteFn<
  JobParamsPanelCsv
>> = function executeJobFactoryFn(reporting, parentLogger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));
  const logger = parentLogger.clone([CSV_FROM_SAVEDOBJECT_JOB_TYPE, 'execute-job']);
  const generateCsv = createGenerateCsv(reporting, parentLogger);

  return async function runTask(jobId: string | null, job, context, req) {
    // There will not be a jobID for "immediate" generation.
    // jobID is only for "queued" jobs
    // Use the jobID as a logging tag or "immediate"
    const jobLogger = logger.clone([jobId === null ? 'immediate' : jobId]);

    const { jobParams } = job;
    const { isImmediate, panel, visType } = jobParams as JobParamsPanelCsv & { panel: SearchPanel };

    if (!panel) {
      i18n.translate(
        'xpack.reporting.exportTypes.csv_from_savedobject.executeJob.failedToAccessPanel',
        { defaultMessage: 'Failed to access panel metadata for job execution' }
      );
    }

    jobLogger.debug(`Execute job generating [${visType}] csv`);

    let requestObject: KibanaRequest | FakeRequest;

    if (isImmediate && req) {
      jobLogger.info(`Executing job from Immediate API using request context`);
      requestObject = req;
    } else {
      jobLogger.info(`Executing job async using encrypted headers`);
      let decryptedHeaders: Record<string, unknown>;
      const serializedEncryptedHeaders = job.headers;
      try {
        if (typeof serializedEncryptedHeaders !== 'string') {
          throw new Error(
            i18n.translate(
              'xpack.reporting.exportTypes.csv_from_savedobject.executeJob.missingJobHeadersErrorMessage',
              {
                defaultMessage: 'Job headers are missing',
              }
            )
          );
        }
        decryptedHeaders = (await crypto.decrypt(serializedEncryptedHeaders)) as Record<
          string,
          unknown
        >;
      } catch (err) {
        jobLogger.error(err);
        throw new Error(
          i18n.translate(
            'xpack.reporting.exportTypes.csv_from_savedobject.executeJob.failedToDecryptReportJobDataErrorMessage',
            {
              defaultMessage:
                'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
              values: { encryptionKey: 'xpack.reporting.encryptionKey', err },
            }
          )
        );
      }

      requestObject = { headers: decryptedHeaders };
    }

    let content: string;
    let maxSizeReached = false;
    let size = 0;
    try {
      const generateResults: CsvResultFromSearch = await generateCsv(
        context,
        requestObject,
        visType as string,
        panel,
        jobParams
      );

      ({
        result: { content, maxSizeReached, size },
      } = generateResults);
    } catch (err) {
      jobLogger.error(`Generate CSV Error! ${err}`);
      throw err;
    }

    if (maxSizeReached) {
      jobLogger.warn(`Max size reached: CSV output truncated to ${size} bytes`);
    }

    return {
      content_type: CONTENT_TYPE_CSV,
      content,
      max_size_reached: maxSizeReached,
      size,
    };
  };
};
