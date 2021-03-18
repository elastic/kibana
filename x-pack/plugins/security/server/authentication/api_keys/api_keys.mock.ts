/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import type { APIKeys } from './api_keys';

export const apiKeysMock = {
  create: (): jest.Mocked<PublicMethodsOf<APIKeys>> => ({
    areAPIKeysEnabled: jest.fn(),
    create: jest.fn(),
    grantAsInternalUser: jest.fn(),
    invalidate: jest.fn(),
    invalidateAsInternalUser: jest.fn(),
  }),
};
