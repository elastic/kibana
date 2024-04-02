/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSecurityContract } from '@kbn/core-security-browser';

import { authenticationMock } from './authentication/index.mock';
import { buildSecurityApi } from './build_security_api';
import { securityMock } from './mocks';

describe('buildSecurityApi', () => {
  let authc: ReturnType<typeof authenticationMock.createSetup>;
  let api: CoreSecurityContract;

  beforeEach(() => {
    authc = authenticationMock.createSetup();
    api = buildSecurityApi({ authc });
  });

  describe('authc.getCurrentUser', () => {
    it('properly delegates to the service', async () => {
      await api.authc.getCurrentUser();

      expect(authc.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('returns the result from the service', async () => {
      const delegateReturn = securityMock.createMockAuthenticatedUser();

      authc.getCurrentUser.mockReturnValue(Promise.resolve(delegateReturn));

      const currentUser = await api.authc.getCurrentUser();

      expect(currentUser).toBe(delegateReturn);
    });
  });
});
