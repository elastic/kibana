/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cryptoFactory } from '../../../lib';
import { CreateJobFn, CreateJobFnFactory } from '../../../types';
import { validateUrls } from '../../common';
import { JobParamsPNG, TaskPayloadPNG } from '../types';

export const createJobFnFactory: CreateJobFnFactory<
  CreateJobFn<JobParamsPNG, TaskPayloadPNG>
> = function createJobFactoryFn(reporting, logger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function createJob(jobParams, _context, req) {
    const serializedEncryptedHeaders = await crypto.encrypt(req.headers);

    validateUrls([jobParams.relativeUrl]);

    return {
      ...jobParams,
      headers: serializedEncryptedHeaders,
      spaceId: reporting.getSpaceId(req, logger),
      forceNow: new Date().toISOString(),
    };
  };
};
