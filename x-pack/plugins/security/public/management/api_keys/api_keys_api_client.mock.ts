/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIKeysAPIClient } from '@kbn/security-api-key-management';
import type { PublicMethodsOf } from '@kbn/utility-types';

export const apiKeysAPIClientMock = {
  create: (): jest.Mocked<PublicMethodsOf<APIKeysAPIClient>> => ({
    invalidateApiKeys: jest.fn(),
    createApiKey: jest.fn(),
    updateApiKey: jest.fn(),
    queryApiKeys: jest.fn(),
  }),
};
