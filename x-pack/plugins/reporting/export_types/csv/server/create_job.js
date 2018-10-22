/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oncePerServer } from '../../../server/lib/once_per_server';
import { cryptoFactory } from '../../../server/lib/crypto';

function createJobFn(server) {
  const crypto = cryptoFactory(server);

  return async function createJob(jobParams, headers, serializedSession, request) {
    const serializedEncryptedHeaders = await crypto.encrypt(headers);

    const savedObjectsClient = request.getSavedObjectsClient();
    const indexPatternSavedObject = await savedObjectsClient.get(
      'index-pattern',
      jobParams.indexPatternId);

    return {
      headers: serializedEncryptedHeaders,
      indexPatternSavedObject: indexPatternSavedObject,
      basePath: request.getBasePath(),
      ...jobParams
    };
  };
}

export const createJobFactory = oncePerServer(createJobFn);
