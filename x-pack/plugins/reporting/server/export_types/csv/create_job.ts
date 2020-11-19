/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CSV_JOB_TYPE } from '../../../common/constants';
import { cryptoFactory } from '../../lib';
import { CreateJobFn, CreateJobFnFactory } from '../../types';
import { IndexPatternSavedObject, JobParamsCSV, TaskPayloadCSV } from './types';

export const createJobFnFactory: CreateJobFnFactory<CreateJobFn<
  JobParamsCSV,
  TaskPayloadCSV
>> = function createJobFactoryFn(reporting, parentLogger) {
  const logger = parentLogger.clone([CSV_JOB_TYPE, 'create-job']);

  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function createJob(jobParams, context, request) {
    const serializedEncryptedHeaders = await crypto.encrypt(request.headers);

    const savedObjectsClient = context.core.savedObjects.client;
    const indexPatternSavedObject = ((await savedObjectsClient.get(
      'index-pattern',
      jobParams.indexPatternId
    )) as unknown) as IndexPatternSavedObject; // FIXME

    return {
      headers: serializedEncryptedHeaders,
      spaceId: reporting.getSpaceId(request, logger),
      indexPatternSavedObject,
      ...jobParams,
    };
  };
};
