/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from 'kibana/server';
import { cryptoFactory } from '../../lib';

export const decryptJobHeaders = async (
  encryptionKey: string | undefined,
  headers: string,
  logger: Logger
): Promise<Record<string, string>> => {
  try {
    if (typeof headers !== 'string') {
      throw new Error(
        i18n.translate('xpack.reporting.exportTypes.common.missingJobHeadersErrorMessage', {
          defaultMessage: 'Job headers are missing',
        })
      );
    }
    const crypto = cryptoFactory(encryptionKey);
    const decryptedHeaders = (await crypto.decrypt(headers)) as Record<string, string>;
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
