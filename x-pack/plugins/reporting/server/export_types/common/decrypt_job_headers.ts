/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { cryptoFactory, LevelLogger } from '../../lib';

interface HasEncryptedHeaders {
  headers?: string;
}

// TODO merge functionality with CSV execute job
export const decryptJobHeaders = async <
  JobParamsType,
  ScheduledTaskParamsType extends HasEncryptedHeaders
>({
  encryptionKey,
  job,
  logger,
}: {
  encryptionKey?: string;
  job: ScheduledTaskParamsType;
  logger: LevelLogger;
}): Promise<Record<string, string>> => {
  try {
    if (typeof job.headers !== 'string') {
      throw new Error(
        i18n.translate('xpack.reporting.exportTypes.common.missingJobHeadersErrorMessage', {
          defaultMessage: 'Job headers are missing',
        })
      );
    }
    const crypto = cryptoFactory(encryptionKey);
    const decryptedHeaders = (await crypto.decrypt(job.headers)) as Record<string, string>;
    return decryptedHeaders;
  } catch (err) {
    logger.error(err);

    throw new Error(
      i18n.translate(
        'xpack.reporting.exportTypes.common.failedToDecryptReportJobDataErrorMessage',
        {
          defaultMessage:
            'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
          values: { encryptionKey: 'xpack.reporting.encryptionKey', err: err.toString() },
        }
      )
    );
  }
};
