/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { APIKeysAPIClient } from './api_keys_api_client';

export const apiKeysAPIClientMock = {
  create: (): jest.Mocked<PublicMethodsOf<APIKeysAPIClient>> => ({
    checkPrivileges: jest.fn(),
    getApiKeys: jest.fn(),
    invalidateApiKeys: jest.fn(),
    createApiKey: jest.fn(),
  }),
};
