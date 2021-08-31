/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cryptoFactory } from '../../lib';
import { CreateJobFn, CreateJobFnFactory } from '../../types';
import { JobParamsPNGV2, TaskPayloadPNGV2 } from './types';

export const createJobFnFactory: CreateJobFnFactory<
  CreateJobFn<JobParamsPNGV2, TaskPayloadPNGV2>
> = function createJobFactoryFn(reporting, logger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function createJob({ locatorParams, ...jobParams }, context, req) {
    const serializedEncryptedHeaders = await crypto.encrypt(req.headers);

    return {
      ...jobParams,
      headers: serializedEncryptedHeaders,
      spaceId: reporting.getSpaceId(req, logger),
      locatorParams: [locatorParams],
      forceNow: new Date().toISOString(),
    };
  };
};
