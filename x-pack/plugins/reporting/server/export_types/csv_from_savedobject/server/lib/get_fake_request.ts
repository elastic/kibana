/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest } from 'kibana/server';
import { cryptoFactory, LevelLogger } from '../../../../lib';
import { ScheduledTaskParams } from '../../../../types';
import { JobParamsPanelCsv } from '../../types';

export const getFakeRequest = async (
  job: ScheduledTaskParams<JobParamsPanelCsv>,
  encryptionKey: string,
  jobLogger: LevelLogger
) => {
  // TODO remove this block: csv from savedobject download is always "sync"
  const crypto = cryptoFactory(encryptionKey);
  let decryptedHeaders: KibanaRequest['headers'];
  const serializedEncryptedHeaders = job.headers;
  try {
    if (typeof serializedEncryptedHeaders !== 'string') {
      throw new Error(
        i18n.translate(
          'xpack.reporting.exportTypes.csv_from_savedobject.executeJob.missingJobHeadersErrorMessage',
          {
            defaultMessage: 'Job headers are missing',
          }
        )
      );
    }
    decryptedHeaders = (await crypto.decrypt(
      serializedEncryptedHeaders
    )) as KibanaRequest['headers'];
  } catch (err) {
    jobLogger.error(err);
    throw new Error(
      i18n.translate(
        'xpack.reporting.exportTypes.csv_from_savedobject.executeJob.failedToDecryptReportJobDataErrorMessage',
        {
          defaultMessage:
            'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
          values: { encryptionKey: 'xpack.reporting.encryptionKey', err },
        }
      )
    );
  }

  return { headers: decryptedHeaders } as KibanaRequest;
};
