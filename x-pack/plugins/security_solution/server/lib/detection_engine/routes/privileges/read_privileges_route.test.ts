/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readPrivilegesRoute } from './read_privileges_route';
import { serverMock, requestContextMock } from '../__mocks__';
import { getPrivilegeRequest, getMockPrivilegesResult } from '../__mocks__/request_responses';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

describe('read_privileges route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getMockPrivilegesResult())
    );

    readPrivilegesRoute(server.router, true);
  });

  describe('normal status codes', () => {
    test('returns 200 when doing a normal request', async () => {
      const response = await server.inject(
        getPrivilegeRequest({ auth: { isAuthenticated: false } }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns the payload when doing a normal request', async () => {
      const response = await server.inject(
        getPrivilegeRequest({ auth: { isAuthenticated: false } }),
        requestContextMock.convertContext(context)
      );
      const expectedBody = {
        ...getMockPrivilegesResult(),
        is_authenticated: false,
        has_encryption_key: true,
      };
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expectedBody);
    });

    test('is authenticated when security says so', async () => {
      const expectedBody = {
        ...getMockPrivilegesResult(),
        is_authenticated: true,
        has_encryption_key: true,
      };

      const response = await server.inject(
        getPrivilegeRequest({ auth: { isAuthenticated: true } }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expectedBody);
    });

    test('returns 500 when bad response from cluster', async () => {
      context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockResolvedValue(
        elasticsearchClientMock.createErrorTransportRequestPromise(new Error('Test error'))
      );
      const response = await server.inject(
        getPrivilegeRequest({ auth: { isAuthenticated: false } }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: 'Test error', status_code: 500 });
    });

    it('returns 404 if siem client is unavailable', async () => {
      const { securitySolution, ...contextWithoutSecuritySolution } = context;
      const response = await server.inject(
        getPrivilegeRequest({ auth: { isAuthenticated: false } }),
        // @ts-expect-error
        contextWithoutSecuritySolution
      );
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });
  });
});
