/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cryptoFactory } from '../../../server/lib/crypto';

export const decryptJobHeaders = async ({ job, server }) => {
  const crypto = cryptoFactory(server);
  const decryptedHeaders = await crypto.decrypt(job.headers);
  return { job, decryptedHeaders, server };
};
