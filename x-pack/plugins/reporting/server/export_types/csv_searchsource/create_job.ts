/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CSV_JOB_TYPE } from '../../../common/constants';
import { checkParamsVersion, cryptoFactory } from '../../lib';
import { CreateJobFn, CreateJobFnFactory } from '../../types';
import { JobParamsCSV, TaskPayloadCSV } from './types';

export const createJobFnFactory: CreateJobFnFactory<
  CreateJobFn<JobParamsCSV, TaskPayloadCSV>
> = function createJobFactoryFn(reporting, parentLogger) {
  const logger = parentLogger.clone([CSV_JOB_TYPE, 'create-job']);

  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function createJob(jobParams, _context, request) {
    const serializedEncryptedHeaders = await crypto.encrypt(request.headers);

    jobParams.version = checkParamsVersion(jobParams, logger);

    return {
      headers: serializedEncryptedHeaders,
      spaceId: reporting.getSpaceId(request, logger),
      ...jobParams,
    };
  };
};
