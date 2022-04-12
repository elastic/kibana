/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { coreMock, httpServerMock } from 'src/core/server/mocks';

import { routeDefinitionParamsMock } from '../index.mock';
import { defineRoleMappingPostRoutes } from './post';

describe('POST role mappings', () => {
  it('allows a role mapping to be created', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    const mockContext = {
      core: coreMock.createRequestHandlerContext(),
      licensing: { license: { check: jest.fn().mockReturnValue({ state: 'valid' }) } } as any,
    };
    mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping.mockResponse({
      created: true,
    } as any);

    defineRoleMappingPostRoutes(mockRouteDefinitionParams);

    const [[, handler]] = mockRouteDefinitionParams.router.post.mock.calls;

    const name = 'mapping1';

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'post',
      path: `/internal/security/role_mapping/${name}`,
      params: { name },
      body: {
        enabled: true,
        roles: ['foo', 'bar'],
        rules: {
          field: {
            dn: 'CN=bob,OU=example,O=com',
          },
        },
      },
      headers,
    });

    const response = await handler(
      coreMock.createCustomRequestHandlerContext(mockContext),
      mockRequest,
      kibanaResponseFactory
    );
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ created: true });

    expect(
      mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
    ).toHaveBeenCalledWith({
      name,
      body: {
        enabled: true,
        roles: ['foo', 'bar'],
        rules: {
          field: {
            dn: 'CN=bob,OU=example,O=com',
          },
        },
      },
    });
  });

  describe('failure', () => {
    it('returns result of license check', async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockContext = {
        core: coreMock.createRequestHandlerContext(),
        licensing: {
          license: {
            check: jest.fn().mockReturnValue({
              state: 'invalid',
              message: 'test forbidden message',
            }),
          },
        } as any,
      };

      defineRoleMappingPostRoutes(mockRouteDefinitionParams);

      const [[, handler]] = mockRouteDefinitionParams.router.post.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'post',
        path: `/internal/security/role_mapping`,
        headers,
      });

      const response = await handler(
        coreMock.createCustomRequestHandlerContext(mockContext),
        mockRequest,
        kibanaResponseFactory
      );
      expect(response.status).toBe(403);
      expect(response.payload).toEqual({ message: 'test forbidden message' });

      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
      ).not.toHaveBeenCalled();
    });
  });
});
