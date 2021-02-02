/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CSV_JOB_TYPE_DEPRECATED } from '../../../common/constants';
import { cryptoFactory } from '../../lib';
import { CreateJobFn, CreateJobFnFactory } from '../../types';
import {
  IndexPatternSavedObjectDeprecatedCSV,
  JobParamsDeprecatedCSV,
  TaskPayloadDeprecatedCSV,
} from './types';

export const createJobFnFactory: CreateJobFnFactory<
  CreateJobFn<JobParamsDeprecatedCSV, TaskPayloadDeprecatedCSV>
> = function createJobFactoryFn(reporting, parentLogger) {
  const logger = parentLogger.clone([CSV_JOB_TYPE_DEPRECATED, 'create-job']);

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
