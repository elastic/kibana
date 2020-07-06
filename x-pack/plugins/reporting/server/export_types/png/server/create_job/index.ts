/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateUrls } from '../../../../../common/validate_urls';
import { cryptoFactory } from '../../../../lib';
import { ESQueueCreateJobFn, ScheduleTaskFnFactory } from '../../../../types';
import { JobParamsPNG } from '../../types';

export const scheduleTaskFnFactory: ScheduleTaskFnFactory<ESQueueCreateJobFn<
  JobParamsPNG
>> = function createJobFactoryFn(reporting) {
  const config = reporting.getConfig();
  const setupDeps = reporting.getPluginSetupDeps();
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
      basePath: setupDeps.basePath(req),
      forceNow: new Date().toISOString(),
    };
  };
};
