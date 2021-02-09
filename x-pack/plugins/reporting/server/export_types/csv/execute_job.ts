/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTENT_TYPE_CSV, CSV_JOB_TYPE_DEPRECATED } from '../../../common/constants';
import { RunTaskFn, RunTaskFnFactory } from '../../types';
import { decryptJobHeaders } from '../common';
import { createGenerateCsv } from './generate_csv';
import { TaskPayloadDeprecatedCSV } from './types';

export const runTaskFnFactory: RunTaskFnFactory<
  RunTaskFn<TaskPayloadDeprecatedCSV>
> = function executeJobFactoryFn(reporting, parentLogger) {
  const config = reporting.getConfig();

  return async function runTask(jobId, job, cancellationToken) {
    const elasticsearch = reporting.getElasticsearchService();
    const logger = parentLogger.clone([CSV_JOB_TYPE_DEPRECATED, 'execute-job', jobId]);
    const generateCsv = createGenerateCsv(logger);

    const encryptionKey = config.get('encryptionKey');
    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = reporting.getFakeRequest({ headers }, job.spaceId, logger);
    const uiSettingsClient = await reporting.getUiSettingsClient(fakeRequest, logger);

    const { callAsCurrentUser } = elasticsearch.legacy.client.asScoped(fakeRequest);
    const callEndpoint = (endpoint: string, clientParams = {}, options = {}) =>
      callAsCurrentUser(endpoint, clientParams, options);

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
