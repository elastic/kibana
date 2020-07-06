/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateUrls } from '../../../../../common/validate_urls';
import { cryptoFactory } from '../../../../lib';
import { ESQueueCreateJobFn, ScheduleTaskFnFactory } from '../../../../types';
import { JobParamsPDF } from '../../types';

export const scheduleTaskFnFactory: ScheduleTaskFnFactory<ESQueueCreateJobFn<
  JobParamsPDF
>> = function createJobFactoryFn(reporting) {
  const config = reporting.getConfig();
  const setupDeps = reporting.getPluginSetupDeps();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function scheduleTaskFn(
    { title, relativeUrls, browserTimezone, layout, objectType },
    context,
    req
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(req.headers);

    validateUrls(relativeUrls);

    return {
      basePath: setupDeps.basePath(req),
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
