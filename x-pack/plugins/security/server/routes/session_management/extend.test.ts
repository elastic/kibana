/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  kibanaResponseFactory,
  RequestHandler,
  RouteConfig,
} from '../../../../../../src/core/server';
import { defineSessionExtendRoutes } from './extend';

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Extend session routes', () => {
  let router: jest.Mocked<SecurityRouter>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;

    defineSessionExtendRoutes(routeParamsMock);
  });

  describe('extend session', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [extendRouteConfig, extendRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/security/session'
      )!;

      routeConfig = extendRouteConfig;
      routeHandler = extendRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toBe(false);
    });

    it('always returns 302.', async () => {
      await expect(
        routeHandler(
          ({} as unknown) as SecurityRequestHandlerContext,
          httpServerMock.createKibanaRequest(),
          kibanaResponseFactory
        )
      ).resolves.toEqual({
        status: 302,
        options: { headers: { location: '/mock-server-basepath/internal/security/session' } },
      });
    });
  });
});
