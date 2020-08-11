/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { CancellationToken } from '../../../common';
import { CONTENT_TYPE_CSV, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../common/constants';
import { RunTaskFnFactory, ScheduledTaskParams, TaskRunResult } from '../../types';
import { createGenerateCsv } from '../csv/generate_csv';
import { JobParamsPanelCsv, SearchPanel } from './types';
import { getGenerateCsvParams } from './lib/get_csv_job';

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
  const config = reporting.getConfig();
  const logger = parentLogger.clone([CSV_FROM_SAVEDOBJECT_JOB_TYPE, 'execute-job']);

  return async function runTask(jobId: string | null, jobPayload, context, req) {
    // There will not be a jobID for "immediate" generation.
    // jobID is only for "queued" jobs
    // Use the jobID as a logging tag or "immediate"
    const { jobParams } = jobPayload;
    const jobLogger = logger.clone([jobId === null ? 'immediate' : jobId]);
    const generateCsv = createGenerateCsv(jobLogger);
    const { panel, visType } = jobParams as JobParamsPanelCsv & { panel: SearchPanel };

    jobLogger.debug(`Execute job generating [${visType}] csv`);

    const savedObjectsClient = context.core.savedObjects.client;

    const uiConfig = await reporting.getUiSettingsServiceFactory(savedObjectsClient);
    const job = await getGenerateCsvParams(jobParams, panel, savedObjectsClient, uiConfig);

    const elasticsearch = reporting.getElasticsearchService();
    const { callAsCurrentUser } = elasticsearch.legacy.client.asScoped(req);

    const { content, maxSizeReached, size, csvContainsFormulas, warnings } = await generateCsv(
      job,
      config,
      uiConfig,
      callAsCurrentUser,
      new CancellationToken() // can not be cancelled
    );

    if (csvContainsFormulas) {
      jobLogger.warn(`CSV may contain formulas whose values have been escaped`);
    }

    if (maxSizeReached) {
      jobLogger.warn(`Max size reached: CSV output truncated to ${size} bytes`);
    }

    return {
      content_type: CONTENT_TYPE_CSV,
      content,
      max_size_reached: maxSizeReached,
      size,
      csv_contains_formulas: csvContainsFormulas,
      warnings,
    };
  };
};
