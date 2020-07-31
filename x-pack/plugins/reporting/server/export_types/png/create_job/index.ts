/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cryptoFactory } from '../../../lib';
import { ESQueueCreateJobFn, ScheduleTaskFnFactory } from '../../../types';
import { validateUrls } from '../../common';
import { JobParamsPNG } from '../types';

export const scheduleTaskFnFactory: ScheduleTaskFnFactory<ESQueueCreateJobFn<
  JobParamsPNG
>> = function createJobFactoryFn(reporting) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function scheduleTask(
    { objectType, title, relativeUrl, browserTimezone, layout },
    context,
    req
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(req.headers);

    validateUrls([relativeUrl]);

    return {
      objectType,
      title,
      relativeUrl,
      headers: serializedEncryptedHeaders,
      browserTimezone,
      layout,
      basePath: config.kbnConfig.get('server', 'basePath'),
      forceNow: new Date().toISOString(),
    };
  };
};
