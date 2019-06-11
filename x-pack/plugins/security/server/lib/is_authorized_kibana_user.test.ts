/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { AuthorizationService } from './authorization/service';
import { AuthenticatedUser } from '../../common/model';
import { isAuthorizedKibanaUser } from './is_authorized_kibana_user';
import { PrivilegeSerializer } from './authorization';
import { EsApplication } from './authorization/get_privileges_with_request';

function buildAuthorizationService(privileges: EsApplication[] = []) {
  return ({
    application: 'kibana-.kibana',
    getPrivilegesWithRequest: jest.fn().mockResolvedValue([...privileges]),
    mode: {
      useRbacForRequest: jest.fn().mockReturnValue(true),
    },
    privileges: {
      get: () => ({
        global: {
          all: ['actions'],
          read: ['actions'],
        },
        space: {
          all: ['actions'],
          read: ['actions'],
        },
        features: {
          feature_1: {
            all: ['actions'],
          },
        },
        reserved: {
          reserved_feature_1: ['actions'],
        },
      }),
    },
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
      {
        application: 'kibana-.kibana',
        privileges: [PrivilegeSerializer.serializeReservedPrivilege('foo')],
        resources: ['*'],
      },
    ]);

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(false);
  });

  it('returns true for users with a base privilege', async () => {
    const request = buildRequest(['some role']);
    const authService = buildAuthorizationService([
      {
        application: 'kibana-.kibana',
        privileges: [PrivilegeSerializer.serializeGlobalBasePrivilege('all')],
        resources: ['*'],
      },
    ]);

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(true);
  });

  it('returns true for users with a feature privilege', async () => {
    const request = buildRequest(['some role']);
    const authService = buildAuthorizationService([
      {
        application: 'kibana-.kibana',
        privileges: [PrivilegeSerializer.serializeFeaturePrivilege('feature_1', 'all')],
        resources: ['*'],
      },
    ]);

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(true);
  });

  it('returns true for users with both reserved and non-reserved privileges', async () => {
    const request = buildRequest(['some role']);
    const authService = buildAuthorizationService([
      {
        application: 'kibana-.kibana',
        privileges: [
          PrivilegeSerializer.serializeFeaturePrivilege('feature_1', 'all'),
          PrivilegeSerializer.serializeReservedPrivilege('foo'),
        ],
        resources: ['*'],
      },
    ]);

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(true);
  });

  it('returns false for users with unknown privileges', async () => {
    const request = buildRequest(['some role']);
    const authService = buildAuthorizationService([
      {
        application: 'kibana-.kibana',
        privileges: [
          PrivilegeSerializer.serializeFeaturePrivilege('feature_1', 'unknown'),
          PrivilegeSerializer.serializeReservedPrivilege('foo'),
        ],
        resources: ['*'],
      },
    ]);

    await expect(isAuthorizedKibanaUser(authService, request)).resolves.toEqual(false);
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
