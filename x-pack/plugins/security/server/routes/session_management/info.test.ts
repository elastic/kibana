/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IRouter,
  kibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  RouteConfig,
} from '../../../../../../src/core/server';
import { Session } from '../../session_management';
import { defineSessionInfoRoutes } from './info';

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { sessionMock } from '../../session_management/session.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Info session routes', () => {
  let router: jest.Mocked<IRouter>;
  let session: jest.Mocked<PublicMethodsOf<Session>>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;
    session = routeParamsMock.session;

    defineSessionInfoRoutes(routeParamsMock);
  });

  describe('extend session', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [extendRouteConfig, extendRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/internal/security/session'
      )!;

      routeConfig = extendRouteConfig;
      routeHandler = extendRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toBe(false);
    });

    it('returns 500 if unhandled exception is thrown when session is retrieved.', async () => {
      const unhandledException = new Error('Something went wrong.');
      session.get.mockRejectedValue(unhandledException);

      const request = httpServerMock.createKibanaRequest();
      await expect(
        routeHandler(({} as unknown) as RequestHandlerContext, request, kibanaResponseFactory)
      ).resolves.toEqual({
        status: 500,
        options: {},
        payload: 'Internal Error',
      });

      expect(session.get).toHaveBeenCalledWith(request);
    });

    it('returns session info.', async () => {
      session.get.mockResolvedValue(
        sessionMock.createValue({ idleTimeoutExpiration: 100, lifespanExpiration: 200 })
      );

      const dateSpy = jest.spyOn(Date, 'now');
      dateSpy.mockReturnValue(1234);

      const expectedBody = {
        now: 1234,
        provider: { type: 'basic', name: 'basic1' },
        idleTimeoutExpiration: 100,
        lifespanExpiration: 200,
      };
      await expect(
        routeHandler(
          ({} as unknown) as RequestHandlerContext,
          httpServerMock.createKibanaRequest(),
          kibanaResponseFactory
        )
      ).resolves.toEqual({
        status: 200,
        payload: expectedBody,
        options: { body: expectedBody },
      });
    });

    it('returns empty response if session is not available.', async () => {
      session.get.mockResolvedValue(null);

      await expect(
        routeHandler(
          ({} as unknown) as RequestHandlerContext,
          httpServerMock.createKibanaRequest(),
          kibanaResponseFactory
        )
      ).resolves.toEqual({ status: 204, options: {} });
    });
  });
});
