/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Crypto } from '@elastic/node-crypto';
import { i18n } from '@kbn/i18n';
import Hapi from 'hapi';
import { KibanaRequest } from '../../../../../../../src/core/server';
import { LevelLogger } from '../../../lib';

export const getRequest = async (
  headers: string | undefined,
  crypto: Crypto,
  logger: LevelLogger
) => {
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
    raw: { req: { url: '/' } },
  } as Hapi.Request);
};
