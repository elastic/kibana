/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseClientFactoryArguments, CaseClient } from './types';
import { CaseClientHandler } from './client';

export { CaseClientHandler as CaseClientImpl } from './client';
export { CaseClient } from './types';

/**
 * Create a CaseClientHandler to external services (other plugins).
 */
export const createExternalCaseClient = (clientArgs: CaseClientFactoryArguments): CaseClient => {
  const client = new CaseClientHandler(clientArgs);
  return client;
};
