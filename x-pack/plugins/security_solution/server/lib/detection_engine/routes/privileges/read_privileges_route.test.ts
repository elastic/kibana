/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { securityMock } from '../../../../../../security/server/mocks';
import { readPrivilegesRoute } from './read_privileges_route';
import { serverMock, requestContextMock } from '../__mocks__';
import { getPrivilegeRequest, getMockPrivilegesResult } from '../__mocks__/request_responses';

describe('read_privileges route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let mockSecurity: ReturnType<typeof securityMock.createSetup>;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    mockSecurity = securityMock.createSetup();
    mockSecurity.authc.isAuthenticated.mockReturnValue(false);
    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getMockPrivilegesResult());
    readPrivilegesRoute(server.router, mockSecurity, false);
  });

  describe('normal status codes', () => {
    test('returns 200 when doing a normal request', async () => {
      const response = await server.inject(getPrivilegeRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns the payload when doing a normal request', async () => {
      const response = await server.inject(getPrivilegeRequest(), context);
      const expectedBody = {
        ...getMockPrivilegesResult(),
        is_authenticated: false,
        has_encryption_key: true,
      };
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expectedBody);
    });

    test('is authenticated when security says so', async () => {
      mockSecurity.authc.isAuthenticated.mockReturnValue(true);
      const expectedBody = {
        ...getMockPrivilegesResult(),
        is_authenticated: true,
        has_encryption_key: true,
      };

      const response = await server.inject(getPrivilegeRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expectedBody);
    });

    test('returns 500 when bad response from cluster', async () => {
      clients.clusterClient.callAsCurrentUser.mockImplementation(() => {
        throw new Error('Test error');
      });
      const response = await server.inject(getPrivilegeRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: 'Test error', status_code: 500 });
    });

    it('returns 404 if siem client is unavailable', async () => {
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      const response = await server.inject(getPrivilegeRequest(), contextWithoutSecuritySolution);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });
  });

  describe('when security plugin is disabled', () => {
    beforeEach(() => {
      server = serverMock.create();
      ({ clients, context } = requestContextMock.createTools());

      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getMockPrivilegesResult());
      readPrivilegesRoute(server.router, undefined, false);
    });

    it('returns unauthenticated', async () => {
      const expectedBody = {
        ...getMockPrivilegesResult(),
        is_authenticated: false,
        has_encryption_key: true,
      };

      const response = await server.inject(getPrivilegeRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expectedBody);
    });
  });
});
