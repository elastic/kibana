/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { CancellationToken } from '../../../common';
import { CSV_SEARCHSOURCE_IMMEDIATE_TYPE } from '../../../common/constants';
import { TaskRunResult } from '../../lib/tasks';
import { getFieldFormats } from '../../services';
import { ReportingRequestHandlerContext, RunTaskFnFactory } from '../../types';
import { CsvGenerator } from '../csv_searchsource/generate_csv/generate_csv';
import { JobParamsDownloadCSV } from './types';

/*
 * ImmediateExecuteFn receives the job doc payload because the payload was
 * generated in the ScheduleFn
 */
export type ImmediateExecuteFn = (
  jobId: null,
  job: JobParamsDownloadCSV,
  context: ReportingRequestHandlerContext,
  req: KibanaRequest
) => Promise<TaskRunResult>;

export const runTaskFnFactory: RunTaskFnFactory<ImmediateExecuteFn> = function executeJobFactoryFn(
  reporting,
  parentLogger
) {
  const config = reporting.getConfig();
  const logger = parentLogger.clone([CSV_SEARCHSOURCE_IMMEDIATE_TYPE, 'execute-job']);

  return async function runTask(jobId, immediateJobParams, context, req) {
    const job = {
      objectType: 'immediate-search',
      ...immediateJobParams,
    };

    const savedObjectsClient = context.core.savedObjects.client;
    const uiSettings = await reporting.getUiSettingsServiceFactory(savedObjectsClient);
    const dataPluginStart = await reporting.getDataService();
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    const [es, searchSourceStart] = await Promise.all([
      (await reporting.getEsClient()).asScoped(req),
      await dataPluginStart.search.searchSource.asScoped(req),
    ]);
    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(req),
      es,
    };
    const dependencies = {
      fieldFormatsRegistry,
      searchSourceStart,
    };
    const cancellationToken = new CancellationToken();

    const csv = new CsvGenerator(job, config, clients, dependencies, cancellationToken, logger);
    const result = await csv.generateData();

    if (result.csv_contains_formulas) {
      logger.warn(`CSV may contain formulas whose values have been escaped`);
    }

    if (result.max_size_reached) {
      logger.warn(`Max size reached: CSV output truncated to ${result.size} bytes`);
    }

    const { warnings } = result;
    if (warnings) {
      warnings.forEach((warning) => {
        logger.warning(warning);
      });
    }

    return result;
  };
};
