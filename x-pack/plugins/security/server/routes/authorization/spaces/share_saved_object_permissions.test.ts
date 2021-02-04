/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kibanaResponseFactory,
  RequestHandler,
  RouteConfig,
} from '../../../../../../../src/core/server';
import { defineShareSavedObjectPermissionRoutes } from './share_saved_object_permissions';

import { httpServerMock } from '../../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../../index.mock';
import { RouteDefinitionParams } from '../..';
import { DeeplyMockedKeys } from '@kbn/utility-types/target/jest';
import { CheckPrivileges } from '../../../authorization/types';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../../types';

describe('Share Saved Object Permissions', () => {
  let router: jest.Mocked<SecurityRouter>;
  let routeParamsMock: DeeplyMockedKeys<RouteDefinitionParams>;

  const mockContext = ({
    licensing: {
      license: { check: jest.fn().mockReturnValue({ state: 'valid' }) },
    },
  } as unknown) as SecurityRequestHandlerContext;

  beforeEach(() => {
    routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router as jest.Mocked<SecurityRouter>;

    defineShareSavedObjectPermissionRoutes(routeParamsMock);
  });

  describe('GET /internal/security/_share_saved_object_permissions', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [shareRouteConfig, shareRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/internal/security/_share_saved_object_permissions'
      )!;

      routeConfig = shareRouteConfig;
      routeHandler = shareRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toHaveProperty('query');
    });

    it('returns `true` when the user is authorized globally', async () => {
      const checkPrivilegesWithRequest = jest.fn().mockResolvedValue({ hasAllRequested: true });

      routeParamsMock.authz.checkPrivilegesWithRequest.mockReturnValue(({
        globally: checkPrivilegesWithRequest,
      } as unknown) as CheckPrivileges);

      const request = httpServerMock.createKibanaRequest({
        query: {
          type: 'foo-type',
        },
      });

      await expect(
        routeHandler(mockContext, request, kibanaResponseFactory)
      ).resolves.toMatchObject({
        status: 200,
        payload: {
          shareToAllSpaces: true,
        },
      });

      expect(routeParamsMock.authz.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(checkPrivilegesWithRequest).toHaveBeenCalledWith({
        kibana: routeParamsMock.authz.actions.savedObject.get('foo-type', 'share-to-space'),
      });
    });

    it('returns `false` when the user is not authorized globally', async () => {
      const checkPrivilegesWithRequest = jest.fn().mockResolvedValue({ hasAllRequested: false });

      routeParamsMock.authz.checkPrivilegesWithRequest.mockReturnValue(({
        globally: checkPrivilegesWithRequest,
      } as unknown) as CheckPrivileges);

      const request = httpServerMock.createKibanaRequest({
        query: {
          type: 'foo-type',
        },
      });

      await expect(
        routeHandler(mockContext, request, kibanaResponseFactory)
      ).resolves.toMatchObject({
        status: 200,
        payload: {
          shareToAllSpaces: false,
        },
      });

      expect(routeParamsMock.authz.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(checkPrivilegesWithRequest).toHaveBeenCalledWith({
        kibana: routeParamsMock.authz.actions.savedObject.get('foo-type', 'share-to-space'),
      });
    });
  });
});
