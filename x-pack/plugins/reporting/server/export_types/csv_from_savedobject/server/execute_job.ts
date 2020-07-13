/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { CONTENT_TYPE_CSV, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../../common/constants';
import { RunTaskFnFactory, ScheduledTaskParams, TaskRunResult } from '../../../types';
import { CsvResultFromSearch } from '../../csv/types';
import { JobParamsPanelCsv, SearchPanel } from '../types';
import { createGenerateCsv } from './lib';

/*
 * The run function receives the full request which provides the un-encrypted
 * headers, so encrypted headers are not part of these kind of job params
 */
type ImmediateJobParams = Omit<ScheduledTaskParams<JobParamsPanelCsv>, 'headers'>;

/*
 * ImmediateExecuteFn receives the job doc payload because the payload was
 * generated in the ScheduleFn
 */
export type ImmediateExecuteFn = (
  jobId: null,
  job: ImmediateJobParams,
  context: RequestHandlerContext,
  req: KibanaRequest
) => Promise<TaskRunResult>;

export const runTaskFnFactory: RunTaskFnFactory<ImmediateExecuteFn> = function executeJobFactoryFn(
  reporting,
  parentLogger
) {
  const logger = parentLogger.clone([CSV_FROM_SAVEDOBJECT_JOB_TYPE, 'execute-job']);
  const generateCsv = createGenerateCsv(reporting, parentLogger);

  return async function runTask(jobId: string | null, job, context, request) {
    // There will not be a jobID for "immediate" generation.
    // jobID is only for "queued" jobs
    // Use the jobID as a logging tag or "immediate"
    const jobLogger = logger.clone([jobId === null ? 'immediate' : jobId]);

    const { jobParams } = job;
    const { panel, visType } = jobParams as JobParamsPanelCsv & { panel: SearchPanel };

    if (!panel) {
      i18n.translate(
        'xpack.reporting.exportTypes.csv_from_savedobject.executeJob.failedToAccessPanel',
        { defaultMessage: 'Failed to access panel metadata for job execution' }
      );
    }

    jobLogger.debug(`Execute job generating [${visType}] csv`);

    let content: string;
    let maxSizeReached = false;
    let size = 0;
    try {
      const generateResults: CsvResultFromSearch = await generateCsv(
        context,
        request,
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
