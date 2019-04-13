/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { i18n } from '@kbn/i18n';

import { cryptoFactory, LevelLogger, oncePerServer } from '../../../server/lib';
import { JobDocOutputExecuted, JobDocPayload, KbnServer } from '../../../types';
import { CONTENT_TYPE_CSV } from '../../../common/constants';
import { CsvResultFromSearch, createGenerateCsv } from './lib';

interface FakeRequest {
  headers: any;
  getBasePath: (opts: any) => string;
  server: KbnServer;
}

type ExecuteJobFn = (job: JobDocPayload, realRequest?: Request) => Promise<JobDocOutputExecuted>;

function executeJobFn(server: KbnServer): ExecuteJobFn {
  const crypto = cryptoFactory(server);
  const config = server.config();
  const serverBasePath = config.get('server.basePath');
  const logger = LevelLogger.createForServer(server, ['reporting', 'savedobject-csv']);
  const generateCsv = createGenerateCsv(logger);

  return async function executeJob(
    job: JobDocPayload,
    realRequest?: Request
  ): Promise<JobDocOutputExecuted> {
    const { basePath, jobParams } = job;
    const { isImmediate, panel, visType } = jobParams;

    logger.debug(`Execute job generating [${visType}] csv`);

    let requestObject: Request | FakeRequest;
    if (isImmediate && realRequest) {
      logger.debug(`executing job from immediate API`);
      requestObject = realRequest;
    } else {
      logger.debug(`executing job async using encrypted headers`);
      let decryptedHeaders;
      const serializedEncryptedHeaders = job.headers;
      try {
        decryptedHeaders = await crypto.decrypt(serializedEncryptedHeaders);
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

      requestObject = {
        headers: decryptedHeaders,
        getBasePath: () => basePath || serverBasePath,
        server,
      };
    }

    let content: string;
    let maxSizeReached = false;
    let size = 0;
    try {
      const generateResults: CsvResultFromSearch = await generateCsv(
        requestObject,
        server,
        visType as string,
        panel,
        jobParams
      );

      ({
        result: { content, maxSizeReached, size },
      } = generateResults);
    } catch (err) {
      logger.error(`Generate CSV Error! ${err}`);
      throw err;
    }

    if (maxSizeReached) {
      logger.warn(`Max size reached: CSV output truncated to ${size} bytes`);
    }

    return {
      content_type: CONTENT_TYPE_CSV,
      content,
      max_size_reached: maxSizeReached,
      size,
    };
  };
}

export const executeJobFactory = oncePerServer(executeJobFn);
