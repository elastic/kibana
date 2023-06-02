/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CsvGenerator } from '@kbn/generate-csv';
import type { TaskPayloadCsvFromSavedObject } from '../../../common/types';
import { getFieldFormats } from '../../services';
import type { RunTaskFn, RunTaskFnFactory } from '../../types';
import { decryptJobHeaders } from '../common';

type RunTaskFnType = RunTaskFn<TaskPayloadCsvFromSavedObject>;

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFnType> = (reporting, _logger) => {
  const config = reporting.getConfig();
  const { encryptionKey, csv: csvConfig } = config;

  return async function runTask(jobId, job, cancellationToken, stream) {
    const logger = _logger.get(`execute:${jobId}`);

    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = reporting.getFakeRequest(headers, job.spaceId, logger);
    const uiSettings = await reporting.getUiSettingsClient(fakeRequest, logger);
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);
    const { data: dataPluginStart, discover: discoverPluginStart } =
      await reporting.getPluginStartDeps();
    const data = dataPluginStart.search.asScoped(fakeRequest);

    const { locatorParams } = job;
    const { params } = locatorParams[0];

    // use Discover contract to convert the job params into inputs for CsvGenerator
    const locatorClient = await discoverPluginStart.locator.asScopedClient(fakeRequest);
    const columns = await locatorClient.columnsFromLocator(params);
    const searchSource = await locatorClient.searchSourceFromLocator(params);

    const [es, searchSourceStart] = await Promise.all([
      (await reporting.getEsClient()).asScoped(fakeRequest),
      await dataPluginStart.search.searchSource.asScoped(fakeRequest),
    ]);

    const clients = { uiSettings, data, es };
    const dependencies = { searchSourceStart, fieldFormatsRegistry };

    const csv = new CsvGenerator(
      {
        columns,
        searchSource: searchSource.getSerializedFields(true),
        ...job,
      },
      csvConfig,
      clients,
      dependencies,
      cancellationToken,
      logger,
      stream
    );
    return await csv.generateData();
  };
};
