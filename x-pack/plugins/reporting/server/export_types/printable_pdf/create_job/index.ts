/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { cryptoFactory } from '../../../lib';
import { CreateJobFn, CreateJobFnFactory } from '../../../types';
import { validateUrls } from '../../common';
import { JobParamsPDF, TaskPayloadPDF } from '../types';
// @ts-ignore no module def (deprecated module)
import { compatibilityShimFactory } from './compatibility_shim';

export const createJobFnFactory: CreateJobFnFactory<CreateJobFn<
  JobParamsPDF,
  TaskPayloadPDF
>> = function createJobFactoryFn(reporting, logger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));
  const compatibilityShim = compatibilityShimFactory(logger);

  // 7.x and below only
  return compatibilityShim(async function createJobFn(
    { title, relativeUrls, browserTimezone, layout, objectType }: JobParamsPDF,
    context: RequestHandlerContext,
    req: KibanaRequest
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(req.headers);

    validateUrls(relativeUrls);

    return {
      headers: serializedEncryptedHeaders,
      spaceId: reporting.getSpaceId(req),
      browserTimezone,
      forceNow: new Date().toISOString(),
      layout,
      objects: relativeUrls.map((u) => ({ relativeUrl: u })), // 7.x only: `objects` in the payload
      title,
      objectType,
    };
  });
};
