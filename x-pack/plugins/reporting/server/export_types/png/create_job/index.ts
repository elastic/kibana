/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PNG_JOB_TYPE } from '../../../../common/constants';
import { cryptoFactory } from '../../../lib';
import { CreateJobFn, CreateJobFnFactory } from '../../../types';
import { validateUrls } from '../../common';
import { JobParamsPNG, TaskPayloadPNG } from '../types';

export const createJobFnFactory: CreateJobFnFactory<CreateJobFn<
  JobParamsPNG,
  TaskPayloadPNG
>> = function createJobFactoryFn(reporting, parentLogger) {
  const logger = parentLogger.clone([PNG_JOB_TYPE, 'execute-job']);
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function createJob(
    { objectType, title, relativeUrl, browserTimezone, layout },
    context,
    req
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(req.headers);

    validateUrls([relativeUrl]);

    return {
      headers: serializedEncryptedHeaders,
      spaceId: reporting.getSpaceId(req, logger),
      objectType,
      title,
      relativeUrl,
      browserTimezone,
      layout,
      forceNow: new Date().toISOString(),
    };
  };
};
