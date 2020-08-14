/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cryptoFactory } from '../../../lib';
import { CreateJobFn, ScheduleTaskFnFactory } from '../../../types';
import { validateUrls } from '../../common';
import { JobParamsPDF } from '../types';

export const scheduleTaskFnFactory: ScheduleTaskFnFactory<CreateJobFn<
  JobParamsPDF
>> = function createJobFactoryFn(reporting) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function scheduleTaskFn(
    { title, relativeUrls, browserTimezone, layout, objectType },
    context,
    req
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(req.headers);

    validateUrls(relativeUrls);

    return {
      basePath: config.kbnConfig.get('server', 'basePath'),
      browserTimezone,
      forceNow: new Date().toISOString(),
      headers: serializedEncryptedHeaders,
      layout,
      relativeUrls,
      title,
      objectType,
    };
  };
};
