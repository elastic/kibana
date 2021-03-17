/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientConstructorArguments, CasesClient } from './types';
import { CasesClientHandler } from './client';

export { CasesClientHandler } from './client';
export { CasesClient } from './types';

/**
 * Create a CasesClientHandler to external services (other plugins).
 */
export const createExternalCasesClient = (
  clientArgs: CasesClientConstructorArguments
): CasesClient => {
  const client = new CasesClientHandler(clientArgs);
  return client;
};
