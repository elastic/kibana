/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CONTENT_TYPE_CSV, CSV_JOB_TYPE } from '../../../../common/constants';
import { cryptoFactory } from '../../../lib';
import { ESQueueWorkerExecuteFn, RunTaskFnFactory } from '../../../types';
import { ScheduledTaskParamsCSV } from '../types';
import { createGenerateCsv } from './generate_csv';
import { getRequest } from './lib/get_request';

export const runTaskFnFactory: RunTaskFnFactory<ESQueueWorkerExecuteFn<
  ScheduledTaskParamsCSV
>> = function executeJobFactoryFn(reporting, parentLogger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));
  const logger = parentLogger.clone([CSV_JOB_TYPE, 'execute-job']);

  return async function runTask(jobId, job, cancellationToken) {
    const elasticsearch = reporting.getElasticsearchService();
    const jobLogger = logger.clone([jobId]);
    const generateCsv = createGenerateCsv(jobLogger);

    const { headers } = job;
    const fakeRequest = await getRequest(headers, crypto, logger);

    const { callAsCurrentUser } = elasticsearch.legacy.client.asScoped(fakeRequest);
    const callEndpoint = (endpoint: string, clientParams = {}, options = {}) =>
      callAsCurrentUser(endpoint, clientParams, options);

    const savedObjectsClient = await reporting.getSavedObjectsClient(fakeRequest);
    const uiSettingsClient = await reporting.getUiSettingsServiceFactory(savedObjectsClient);

    const { content, maxSizeReached, size, csvContainsFormulas, warnings } = await generateCsv(
      job,
      config,
      uiSettingsClient,
      callEndpoint,
      cancellationToken
    );

    // @TODO: Consolidate these one-off warnings into the warnings array (max-size reached and csv contains formulas)
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
