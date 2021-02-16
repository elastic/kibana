/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cryptoFactory } from '../../lib';
import { CreateJobFn, CreateJobFnFactory } from '../../types';
import {
  IndexPatternSavedObjectDeprecatedCSV,
  JobParamsDeprecatedCSV,
  TaskPayloadDeprecatedCSV,
} from './types';

export const createJobFnFactory: CreateJobFnFactory<
  CreateJobFn<JobParamsDeprecatedCSV, TaskPayloadDeprecatedCSV>
> = function createJobFactoryFn(reporting, logger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function createJob(jobParams, context, request) {
    const serializedEncryptedHeaders = await crypto.encrypt(request.headers);

    const savedObjectsClient = context.core.savedObjects.client;
    const indexPatternSavedObject = ((await savedObjectsClient.get(
      'index-pattern',
      jobParams.indexPatternId
    )) as unknown) as IndexPatternSavedObjectDeprecatedCSV;

    return {
      headers: serializedEncryptedHeaders,
      spaceId: reporting.getSpaceId(request, logger),
      indexPatternSavedObject,
      ...jobParams,
    };
  };
};
