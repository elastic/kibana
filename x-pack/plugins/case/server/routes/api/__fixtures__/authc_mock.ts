/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '../../../../../security/server';
import { securityMock } from '../../../../../security/server/mocks';

function createAuthenticationMock({
  currentUser,
}: { currentUser?: AuthenticatedUser | null } = {}) {
  const { authc } = securityMock.createSetup();
  authc.getCurrentUser.mockReturnValue(
    currentUser !== undefined
      ? currentUser
      : ({
          email: 'd00d@awesome.com',
          username: 'awesome',
          full_name: 'Awesome D00d',
        } as AuthenticatedUser)
  );
  return authc;
}

export const authenticationMock = {
  create: () => createAuthenticationMock(),
  createInvalid: () => createAuthenticationMock({ currentUser: null }),
};
