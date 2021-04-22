/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import type { SessionUserDataStorage } from './session_user_data_storage';

export const sessionUserDataStorageMock = {
  create: (): jest.Mocked<PublicMethodsOf<SessionUserDataStorage>> => ({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  }),
};
