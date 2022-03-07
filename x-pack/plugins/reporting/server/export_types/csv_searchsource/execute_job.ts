/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  return async function runTask(jobId, job, cancellationToken, stream) {
    const logger = parentLogger.get(`execute-job:${jobId}`);

    const encryptionKey = config.get('encryptionKey');
    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = reporting.getFakeRequest({ headers }, job.spaceId, logger);
    const uiSettings = await reporting.getUiSettingsClient(fakeRequest, logger);
    const dataPluginStart = await reporting.getDataService();
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    const [es, searchSourceStart] = await Promise.all([
      (await reporting.getEsClient()).asScoped(fakeRequest),
      await dataPluginStart.search.searchSource.asScoped(fakeRequest),
    ]);

    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(fakeRequest),
      es,
    };
    const dependencies = {
      searchSourceStart,
      fieldFormatsRegistry,
    };

    const csv = new CsvGenerator(
      job,
      config,
      clients,
      dependencies,
      cancellationToken,
      logger,
      stream
    );
    return await csv.generateData();
  };
};
