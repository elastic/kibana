/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Authorization } from './authorization';

type Schema = PublicMethodsOf<Authorization>;
export type AuthorizationMock = jest.Mocked<Schema>;

export const createAuthorizationMock = () => {
  const mocked: AuthorizationMock = {
    ensureAuthorized: jest.fn(),
    getAuthorizationFilter: jest.fn(),
    getAndEnsureAuthorizedEntities: jest.fn(),
  };
  return mocked;
};
