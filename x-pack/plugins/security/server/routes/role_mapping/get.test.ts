/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routeDefinitionParamsMock } from '../index.mock';
import { elasticsearchServiceMock, httpServerMock } from 'src/core/server/mocks';
import { defineRoleMappingGetRoutes } from './get';
import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';
import { LICENSE_CHECK_STATE } from '../../../../licensing/server';

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

describe('GET role mappings', () => {
  it('returns all role mappings', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

    const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
    mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(mockRoleMappingResponse);

    defineRoleMappingGetRoutes(mockRouteDefinitionParams);

    const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `/internal/security/role_mapping`,
      headers,
    });
    const mockContext = ({
      licensing: {
        license: { check: jest.fn().mockReturnValue({ state: LICENSE_CHECK_STATE.Valid }) },
      },
    } as unknown) as RequestHandlerContext;

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
  });

  it('returns role mapping by name', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

    const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
    mockScopedClusterClient.callAsCurrentUser.mockResolvedValue({
      mapping1: {
        enabled: true,
        roles: ['foo', 'bar'],
        rules: {
          field: {
            dn: 'CN=bob,OU=example,O=com',
          },
        },
      },
    });

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
    const mockContext = ({
      licensing: {
        license: { check: jest.fn().mockReturnValue({ state: LICENSE_CHECK_STATE.Valid }) },
      },
    } as unknown) as RequestHandlerContext;

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
  });

  describe('failure', () => {
    it('returns result of license check', async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

      defineRoleMappingGetRoutes(mockRouteDefinitionParams);

      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/internal/security/role_mapping`,
        headers,
      });
      const mockContext = ({
        licensing: {
          license: {
            check: jest.fn().mockReturnValue({
              state: LICENSE_CHECK_STATE.Invalid,
              message: 'test forbidden message',
            }),
          },
        },
      } as unknown) as RequestHandlerContext;

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(403);
      expect(response.payload).toEqual({ message: 'test forbidden message' });
    });
  });
});
