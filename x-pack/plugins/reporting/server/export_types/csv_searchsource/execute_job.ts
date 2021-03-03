/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CSV_JOB_TYPE } from '../../../common/constants';
import { getFieldFormats } from '../../services';
import { RunTaskFn, RunTaskFnFactory } from '../../types';
import { decryptJobHeaders } from '../common';
import { CsvGenerator } from './generate_csv/generate_csv';
import { TaskPayloadCSV } from './types';

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFn<TaskPayloadCSV>> = (
  reporting,
  parentLogger
) => {
  const config = reporting.getConfig();

  return async function runTask(jobId, job, cancellationToken) {
    const logger = parentLogger.clone([CSV_JOB_TYPE, 'execute-job', jobId]);

    const encryptionKey = config.get('encryptionKey');
    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = reporting.getFakeRequest({ headers }, job.spaceId, logger);
    const uiSettingsClient = await reporting.getUiSettingsClient(fakeRequest, logger);

    const dataPluginStart = await reporting.getDataService();
    const searchSourceService = await dataPluginStart.search.searchSource.asScoped(fakeRequest);
    const data = dataPluginStart.search.asScoped(fakeRequest);

    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(
      uiSettingsClient
    );

    const esClient = (await reporting.getEsClient()).asScoped(fakeRequest);

    const csv = new CsvGenerator(
      job,
      config,
      esClient,
      data,
      uiSettingsClient,
      searchSourceService,
      fieldFormatsRegistry,
      cancellationToken,
      logger
    );

    return await csv.generateData();
  };
};
