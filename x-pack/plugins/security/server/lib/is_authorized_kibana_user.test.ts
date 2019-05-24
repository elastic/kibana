/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { AuthorizationService } from './authorization/service';
import { RoleKibanaPrivilege, AuthenticatedUser } from '../../common/model';
import { isAuthorizedKibanaUser } from './is_authorized_kibana_user';

function buildAuthorizationService(privileges: RoleKibanaPrivilege[] = []) {
  return ({
    getPrivilegesWithRequest: jest.fn().mockResolvedValue([...privileges]),
  } as unknown) as AuthorizationService;
}

function buildRequest(roles: string[] = []): Legacy.Request {
  const request: Legacy.Request = ({
    auth: {
      credentials: {
        roles,
      },
    },
  } as unknown) as Legacy.Request;

  return request;
}

function buildUser(roles: string[] = []): AuthenticatedUser {
  return {
    username: 'test user',
    roles,
  } as AuthenticatedUser;
}

describe('isAuthorizedKibanaUser', () => {
  it('returns true for superusers', async () => {
    const request = buildRequest(['some role', 'superuser']);
    const authService = buildAuthorizationService();

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(true);
  });

  it('returns false for users with no privileges', async () => {
    const request = buildRequest(['some role']);
    const authService = buildAuthorizationService();

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(false);
  });

  it('returns false for users with only reserved privileges', async () => {
    const request = buildRequest(['some role']);
    const authService = buildAuthorizationService([
      { base: [], feature: {}, spaces: [], _reserved: ['foo'] },
    ]);

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(false);
  });

  it('returns true for users with a base privilege', async () => {
    const request = buildRequest(['some role']);
    const authService = buildAuthorizationService([{ base: ['foo'], feature: {}, spaces: [] }]);

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(true);
  });

  it('returns true for users with a feature privilege', async () => {
    const request = buildRequest(['some role']);
    const authService = buildAuthorizationService([
      { base: [], feature: { feature1: ['foo'] }, spaces: [] },
    ]);

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(true);
  });

  it('returns true for users with both reserved and non-reserved privileges', async () => {
    const request = buildRequest(['some role']);
    const authService = buildAuthorizationService([
      { base: [], feature: { feature1: ['foo'] }, spaces: ['*'] },
      { base: [], feature: {}, spaces: [], _reserved: ['foo'] },
    ]);

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(true);
  });

  describe('with the optional user argument', () => {
    it('returns true for superusers', async () => {
      const request = buildRequest();
      const user = buildUser(['some role', 'superuser']);
      const authService = buildAuthorizationService();

      await expect(isAuthorizedKibanaUser(authService, request, user)).resolves.toEqual(true);
    });

    it('returns false for users with no privileges', async () => {
      const request = buildRequest();
      const user = buildUser(['some role']);
      const authService = buildAuthorizationService();

      await expect(isAuthorizedKibanaUser(authService, request, user)).resolves.toEqual(false);
    });
  });
});
