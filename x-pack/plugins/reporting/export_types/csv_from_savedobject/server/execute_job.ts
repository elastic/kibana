/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CONTENT_TYPE_CSV } from '../../../common/constants';
// @ts-ignore
import { createTaggedLogger, cryptoFactory, oncePerServer } from '../../../server/lib';
import { JobDocPayload, KbnServer, Logger } from '../../../types';
import {} from '../types';
import { createGenerateCsv } from './lib/generate_csv';

interface JobDocOutputPseudo {
  content_type: 'text/csv';
  content: string | null;
}

interface FakeRequest {
  headers: any;
  getBasePath: (opts: any) => string;
  server: KbnServer;
}

/*
 * @return {Object}: pseudo-JobDocOutput. See interface JobDocOutput
 */
function executeJobFn(server: KbnServer) {
  const config = server.config();
  const logger: Logger = {
    debug: createTaggedLogger(server, ['reporting', 'savedobject-csv', 'debug']),
    warning: createTaggedLogger(server, ['reporting', 'savedobject-csv', 'warning']),
    error: createTaggedLogger(server, ['reporting', 'savedobject-csv', 'error']),
  };

  const generateCsv = createGenerateCsv(logger);
  return async function executeJob(job: JobDocPayload): Promise<JobDocOutputPseudo> {
    const {
      jobParams: { isImmediate, panel, visType },
    } = job;

    if (!isImmediate) {
      logger.debug(`Execute job generating [${visType}] csv`);

      let decryptedHeaders;
      try {
        decryptedHeaders = await cryptoFactory(server).decrypt(job.headers);
      } catch (err) {
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

      const fakeRequest: FakeRequest = {
        headers: decryptedHeaders,
        getBasePath: () => job.basePath || config.get('server.basePath'),
        server,
      };

      const content = await generateCsv(fakeRequest, server, visType as string, panel);
      return {
        content_type: CONTENT_TYPE_CSV,
        content: content.result ? content.result.content : null,
      };
    }

    logger.debug(`Execute job using previously-generated [${visType}] csv`);

    return {
      content_type: CONTENT_TYPE_CSV,
      content: job.objects || null, // FIXME payload.objects has the stashed job output. There should be an update that sets it to null to reduce data storage: it could be ~100mb
    };
  };
}

export const executeJobFactory = oncePerServer(executeJobFn);
