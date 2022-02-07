/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import type { RequestHandler, RouteConfig } from 'src/core/server';
import { kibanaResponseFactory } from 'src/core/server';
import { coreMock, httpServerMock } from 'src/core/server/mocks';

import { securityMock } from '../../mocks';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineKibanaUserRoleDeprecationRoutes } from './kibana_user_role';

function createMockUser(user: Partial<estypes.SecurityUser> = {}) {
  return { enabled: true, username: 'userA', roles: ['roleA'], metadata: {}, ...user };
}

function createMockRoleMapping(mapping: Partial<estypes.SecurityRoleMapping> = {}) {
  return { enabled: true, roles: ['roleA'], rules: {}, metadata: {}, ...mapping };
}

describe('Kibana user deprecation routes', () => {
  let router: jest.Mocked<SecurityRouter>;
  let mockContext: DeeplyMockedKeys<SecurityRequestHandlerContext> & {
    core: ReturnType<typeof coreMock.createRequestHandlerContext>;
  };
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;

    mockContext = {
      core: coreMock.createRequestHandlerContext(),
      licensing: { license: { check: jest.fn().mockReturnValue({ state: 'valid' }) } },
    } as any;

    defineKibanaUserRoleDeprecationRoutes(routeParamsMock);
  });

  describe('Users with Kibana user role', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [fixUsersRouteConfig, fixUsersRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/security/deprecations/kibana_user_role/_fix_users'
      )!;

      routeConfig = fixUsersRouteConfig;
      routeHandler = fixUsersRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toBe(false);
    });

    it('fails if cannot retrieve users', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.security.getUser.mockRejectedValue(
        new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 500, body: new Error('Oh no') })
        )
      );

      await expect(
        routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 500 }));

      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putUser
      ).not.toHaveBeenCalled();
    });

    it('fails if fails to update user', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.security.getUser.mockResponse({
        userA: createMockUser({ username: 'userA', roles: ['roleA', 'kibana_user'] }),
        userB: createMockUser({ username: 'userB', roles: ['kibana_user'] }),
      });
      mockContext.core.elasticsearch.client.asCurrentUser.security.putUser.mockRejectedValue(
        new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 500, body: new Error('Oh no') })
        )
      );

      await expect(
        routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 500 }));

      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putUser
      ).toHaveBeenCalledTimes(1);
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putUser
      ).toHaveBeenCalledWith({
        username: 'userA',
        body: createMockUser({ username: 'userA', roles: ['roleA', 'kibana_admin'] }),
      });
    });

    it('does nothing if there are no users with Kibana user role', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.security.getUser.mockResponse({
        userA: createMockUser(),
      });

      await expect(
        routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 200 }));

      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putUser
      ).not.toHaveBeenCalled();
    });

    it('updates users with Kibana user role', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.security.getUser.mockResponse({
        userA: createMockUser({ username: 'userA', roles: ['roleA'] }),
        userB: createMockUser({ username: 'userB', roles: ['roleB', 'kibana_user'] }),
        userC: createMockUser({ username: 'userC', roles: ['roleC'] }),
        userD: createMockUser({ username: 'userD', roles: ['kibana_user'] }),
        userE: createMockUser({
          username: 'userE',
          roles: ['kibana_user', 'kibana_admin', 'roleE'],
        }),
      });

      await expect(
        routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 200 }));

      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putUser
      ).toHaveBeenCalledTimes(3);
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putUser
      ).toHaveBeenCalledWith({
        username: 'userB',
        body: createMockUser({ username: 'userB', roles: ['roleB', 'kibana_admin'] }),
      });
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putUser
      ).toHaveBeenCalledWith({
        username: 'userD',
        body: createMockUser({ username: 'userD', roles: ['kibana_admin'] }),
      });
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putUser
      ).toHaveBeenCalledWith({
        username: 'userE',
        body: createMockUser({ username: 'userE', roles: ['kibana_admin', 'roleE'] }),
      });
    });
  });

  describe('Role mappings with Kibana user role', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [fixRoleMappingsRouteConfig, fixRoleMappingsRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) =>
          path === '/internal/security/deprecations/kibana_user_role/_fix_role_mappings'
      )!;

      routeConfig = fixRoleMappingsRouteConfig;
      routeHandler = fixRoleMappingsRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toBe(false);
    });

    it('fails if cannot retrieve role mappings', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping.mockRejectedValue(
        new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 500, body: new Error('Oh no') })
        )
      );

      await expect(
        routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 500 }));

      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
      ).not.toHaveBeenCalled();
    });

    it('fails if fails to update role mapping', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping.mockResponse({
        mappingA: createMockRoleMapping({ roles: ['roleA', 'kibana_user'] }),
        mappingB: createMockRoleMapping({ roles: ['kibana_user'] }),
      });
      mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping.mockRejectedValue(
        new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 500, body: new Error('Oh no') })
        )
      );

      await expect(
        routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 500 }));

      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
      ).toHaveBeenCalledTimes(1);
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
      ).toHaveBeenCalledWith({
        name: 'mappingA',
        body: createMockRoleMapping({ roles: ['roleA', 'kibana_admin'] }),
      });
    });

    it('does nothing if there are no role mappings with Kibana user role', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping.mockResponse({
        mappingA: createMockRoleMapping(),
      });

      await expect(
        routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 200 }));

      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
      ).not.toHaveBeenCalled();
    });

    it('updates role mappings with Kibana user role', async () => {
      mockContext.core.elasticsearch.client.asCurrentUser.security.getRoleMapping.mockResponse({
        mappingA: createMockRoleMapping({ roles: ['roleA'] }),
        mappingB: createMockRoleMapping({ roles: ['roleB', 'kibana_user'] }),
        mappingC: createMockRoleMapping({ roles: ['roleC'] }),
        mappingD: createMockRoleMapping({ roles: ['kibana_user'] }),
        mappingE: createMockRoleMapping({ roles: ['kibana_user', 'kibana_admin', 'roleE'] }),
      });

      await expect(
        routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 200 }));

      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
      ).toHaveBeenCalledTimes(3);
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
      ).toHaveBeenCalledWith({
        name: 'mappingB',
        body: createMockRoleMapping({ roles: ['roleB', 'kibana_admin'] }),
      });
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
      ).toHaveBeenCalledWith({
        name: 'mappingD',
        body: createMockRoleMapping({ roles: ['kibana_admin'] }),
      });
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.putRoleMapping
      ).toHaveBeenCalledWith({
        name: 'mappingE',
        body: createMockRoleMapping({ roles: ['kibana_admin', 'roleE'] }),
      });
    });
  });
});
