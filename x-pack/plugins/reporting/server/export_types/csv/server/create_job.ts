/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cryptoFactory } from '../../../lib';
import { ESQueueCreateJobFn, ScheduleTaskFnFactory } from '../../../types';
import { JobParamsDiscoverCsv } from '../types';

export const scheduleTaskFnFactory: ScheduleTaskFnFactory<ESQueueCreateJobFn<
  JobParamsDiscoverCsv
>> = function createJobFactoryFn(reporting) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));
  const setupDeps = reporting.getPluginSetupDeps();

  return async function scheduleTask(jobParams, context, request) {
    const serializedEncryptedHeaders = await crypto.encrypt(request.headers);

    const savedObjectsClient = context.core.savedObjects.client;
    const indexPatternSavedObject = await savedObjectsClient.get(
      'index-pattern',
      jobParams.indexPatternId!
    );

    return {
      headers: serializedEncryptedHeaders,
      indexPatternSavedObject,
      basePath: setupDeps.basePath(request),
      ...jobParams,
    };
  };
};
