/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { cryptoFactory } from '../../../lib';
import { CreateJobFn, CreateJobFnFactory, ReportingRequestHandlerContext } from '../../../types';
import { validateUrls } from '../../common';
import { JobParamsPDF, JobParamsPDFLegacy, TaskPayloadPDF } from '../types';
import { compatibilityShim } from './compatibility_shim';

/*
 * Incoming job params can be `JobParamsPDF` or `JobParamsPDFLegacy` depending
 * on the version that the POST URL was copied from.
 */
export const createJobFnFactory: CreateJobFnFactory<
  CreateJobFn<JobParamsPDF | JobParamsPDFLegacy, TaskPayloadPDF>
> = function createJobFactoryFn(reporting, logger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return compatibilityShim(async function createJobFn(
    { relativeUrls, ...jobParams }: JobParamsPDF, // relativeUrls does not belong in the payload
    _context: ReportingRequestHandlerContext,
    req: KibanaRequest
  ) {
    validateUrls(relativeUrls);

    const serializedEncryptedHeaders = await crypto.encrypt(req.headers);

    // return the payload
    return {
      ...jobParams,
      headers: serializedEncryptedHeaders,
      spaceId: reporting.getSpaceId(req, logger),
      forceNow: new Date().toISOString(),
      objects: relativeUrls.map((u) => ({ relativeUrl: u })),
    };
  }, logger);
};
