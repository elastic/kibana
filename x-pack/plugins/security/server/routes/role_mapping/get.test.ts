/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { routeDefinitionParamsMock } from '../index.mock';
import { defineRoleMappingGetRoutes } from './get';

const mockRoleMappingResponse = {
  mapping1: {
    enabled: true,
    roles: ['foo', 'bar'],
    rules: {
      field: {
        dn: 'CN=bob,OU=example,O=com',
      },
    },
  },
  mapping2: {
    enabled: true,
    role_templates: [{ template: JSON.stringify({ source: 'foo_{{username}}' }) }],
    rules: {
      any: [
        {
          field: {
            dn: 'CN=admin,OU=example,O=com',
          },
        },
        {
          field: {
            username: 'admin_*',
          },
        },
      ],
    },
  },
  mapping3: {
    enabled: true,
    role_templates: [{ template: 'template with invalid json' }],
    rules: {
      field: {
        dn: 'CN=bob,OU=example,O=com',
      },
    },
  },
};

function getMockContext(
  licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
) {
  return {
    core: coreMock.createRequestHandlerContext(),
    licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } } as any,
  };
}

describe('GET role mappings', () => {
  it('returns all role mappings', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    const mockContext = getMockContext();
    mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping.mockResponse(
      mockRoleMappingResponse as any
    );

    defineRoleMappingGetRoutes(mockRouteDefinitionParams);

    const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `/internal/security/role_mapping`,
      headers,
    });

    const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual([
      {
        name: 'mapping1',
        enabled: true,
        roles: ['foo', 'bar'],
        role_templates: [],
        rules: {
          field: {
            dn: 'CN=bob,OU=example,O=com',
          },
        },
      },
      {
        name: 'mapping2',
        enabled: true,
        role_templates: [{ template: { source: 'foo_{{username}}' } }],
        rules: {
          any: [
            {
              field: {
                dn: 'CN=admin,OU=example,O=com',
              },
            },
            {
              field: {
                username: 'admin_*',
              },
            },
          ],
        },
      },
      {
        name: 'mapping3',
        enabled: true,
        role_templates: [{ template: 'template with invalid json' }],
        rules: {
          field: {
            dn: 'CN=bob,OU=example,O=com',
          },
        },
      },
    ]);

    expect(
      mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping
    ).toHaveBeenCalledWith({ name: undefined });
  });

  it('returns role mapping by name', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    const mockContext = getMockContext();
    mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping.mockResponse({
      mapping1: {
        enabled: true,
        roles: ['foo', 'bar'],
        rules: {
          field: {
            dn: 'CN=bob,OU=example,O=com',
          },
        },
      },
    } as any);

    defineRoleMappingGetRoutes(mockRouteDefinitionParams);

    const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

    const name = 'mapping1';

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `/internal/security/role_mapping/${name}`,
      params: { name },
      headers,
    });

    const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      name: 'mapping1',
      enabled: true,
      roles: ['foo', 'bar'],
      role_templates: [],
      rules: {
        field: {
          dn: 'CN=bob,OU=example,O=com',
        },
      },
    });

    expect(
      mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping
    ).toHaveBeenCalledWith({ name });
  });

  describe('failure', () => {
    it('returns result of license check', async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockContext = getMockContext({ state: 'invalid', message: 'test forbidden message' });

      defineRoleMappingGetRoutes(mockRouteDefinitionParams);

      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/internal/security/role_mapping`,
        headers,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(403);
      expect(response.payload).toEqual({ message: 'test forbidden message' });
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping
      ).not.toHaveBeenCalled();
    });

    it('returns a 404 when the role mapping is not found', async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockContext = getMockContext();
      mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping.mockRejectedValue(
        Boom.notFound('role mapping not found!')
      );

      defineRoleMappingGetRoutes(mockRouteDefinitionParams);

      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const name = 'mapping1';

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/internal/security/role_mapping/${name}`,
        params: { name },
        headers,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(404);
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping
      ).toHaveBeenCalledWith({ name });
    });
  });
});
