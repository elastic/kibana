/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Crypto } from '@elastic/node-crypto';
import { i18n } from '@kbn/i18n';
import Hapi from 'hapi';
import { KibanaRequest } from '../../../../../../src/core/server';
import { CONTENT_TYPE_CSV, CSV_JOB_TYPE } from '../../../common/constants';
import { cryptoFactory, LevelLogger } from '../../lib';
import { WorkerExecuteFn, RunTaskFnFactory } from '../../types';
import { ScheduledTaskParamsCSV } from './types';
import { createGenerateCsv } from './generate_csv';

const getRequest = async (headers: string | undefined, crypto: Crypto, logger: LevelLogger) => {
  const decryptHeaders = async () => {
    try {
      if (typeof headers !== 'string') {
        throw new Error(
          i18n.translate(
            'xpack.reporting.exportTypes.csv.executeJob.missingJobHeadersErrorMessage',
            {
              defaultMessage: 'Job headers are missing',
            }
          )
        );
      }
      return await crypto.decrypt(headers);
    } catch (err) {
      logger.error(err);
      throw new Error(
          i18n.translate(
            'xpack.reporting.exportTypes.csv.executeJob.failedToDecryptReportJobDataErrorMessage',
            {
              defaultMessage: 'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
              values: { encryptionKey: 'xpack.reporting.encryptionKey', err: err.toString() },
            }
          )
        ); // prettier-ignore
    }
  };

  return KibanaRequest.from({
    headers: await decryptHeaders(),
    // This is used by the spaces SavedObjectClientWrapper to determine the existing space.
    // We use the basePath from the saved job, which we'll have post spaces being implemented;
    // or we use the server base path, which uses the default space
    path: '/',
    route: { settings: {} },
    url: { href: '/' },
    app: {},
    raw: { req: { url: '/' } },
  } as Hapi.Request);
};

export const runTaskFnFactory: RunTaskFnFactory<WorkerExecuteFn<
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
