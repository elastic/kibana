/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { APIKeys } from '.';

export const apiKeysMock = {
  create: (): jest.Mocked<PublicMethodsOf<APIKeys>> => ({
    areAPIKeysEnabled: jest.fn(),
    create: jest.fn(),
    grantAsInternalUser: jest.fn(),
    invalidate: jest.fn(),
    invalidateAsInternalUser: jest.fn(),
  }),
};
