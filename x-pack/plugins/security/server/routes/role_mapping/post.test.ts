/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routeDefinitionParamsMock } from '../index.mock';
import { elasticsearchServiceMock, httpServerMock } from 'src/core/server/mocks';
import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';
import { LICENSE_CHECK_STATE } from '../../../../licensing/server';
import { defineRoleMappingPostRoutes } from './post';

describe('POST role mappings', () => {
  it('allows a role mapping to be created', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

    const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
    mockScopedClusterClient.callAsCurrentUser.mockResolvedValue({ created: true });

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
    const mockContext = ({
      licensing: {
        license: { check: jest.fn().mockReturnValue({ state: LICENSE_CHECK_STATE.Valid }) },
      },
    } as unknown) as RequestHandlerContext;

    const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ created: true });

    expect(mockRouteDefinitionParams.clusterClient.asScoped).toHaveBeenCalledWith(mockRequest);
    expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
      'shield.saveRoleMapping',
      {
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
      }
    );
  });

  describe('failure', () => {
    it('returns result of license check', async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

      defineRoleMappingPostRoutes(mockRouteDefinitionParams);

      const [[, handler]] = mockRouteDefinitionParams.router.post.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'post',
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

      expect(mockRouteDefinitionParams.clusterClient.asScoped).not.toHaveBeenCalled();
    });
  });
});
