/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { cryptoFactory } from '../../../lib';
import { ESQueueCreateJobFn, ScheduleTaskFnFactory } from '../../../types';
import { validateUrls } from '../../common';
import { JobParamsPDF } from '../types';
// @ts-ignore no module def (deprecated module)
import { compatibilityShimFactory } from './compatibility_shim';

export const scheduleTaskFnFactory: ScheduleTaskFnFactory<ESQueueCreateJobFn<
  JobParamsPDF
>> = function createJobFactoryFn(reporting, logger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));
  const compatibilityShim = compatibilityShimFactory(logger);

  return compatibilityShim(async function createJobFn(
    { title, relativeUrls, browserTimezone, layout, objectType }: JobParamsPDF,
    context: RequestHandlerContext,
    req: KibanaRequest
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(req.headers);

    validateUrls(relativeUrls);

    return {
      basePath: config.kbnConfig.get('server', 'basePath'),
      browserTimezone,
      forceNow: new Date().toISOString(),
      headers: serializedEncryptedHeaders,
      layout,
      objects: relativeUrls.map((u) => ({ relativeUrl: u })),
      title,
      type: objectType, // Note: this changes the shape of the job params object
    };
  });
};
