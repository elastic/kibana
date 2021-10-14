/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTENT_TYPE_CSV } from '../../../common/constants';
import { RunTaskFn, RunTaskFnFactory } from '../../types';
import { decryptJobHeaders } from '../common';
import { createGenerateCsv } from './generate_csv';
import { TaskPayloadDeprecatedCSV } from './types';

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFn<TaskPayloadDeprecatedCSV>> =
  function executeJobFactoryFn(reporting, parentLogger) {
    const config = reporting.getConfig();

    return async function runTask(jobId, job, cancellationToken, stream) {
      const elasticsearch = await reporting.getEsClient();
      const logger = parentLogger.clone([jobId]);
      const generateCsv = createGenerateCsv(logger);

      const encryptionKey = config.get('encryptionKey');
      const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
      const fakeRequest = reporting.getFakeRequest({ headers }, job.spaceId, logger);
      const uiSettingsClient = await reporting.getUiSettingsClient(fakeRequest, logger);
      const { asCurrentUser: elasticsearchClient } = elasticsearch.asScoped(fakeRequest);

      const { maxSizeReached, csvContainsFormulas, warnings } = await generateCsv(
        job,
        config,
        uiSettingsClient,
        elasticsearchClient,
        cancellationToken,
        stream
      );

      // @TODO: Consolidate these one-off warnings into the warnings array (max-size reached and csv contains formulas)
      return {
        content_type: CONTENT_TYPE_CSV,
        max_size_reached: maxSizeReached,
        csv_contains_formulas: csvContainsFormulas,
        warnings,
      };
    };
  };
