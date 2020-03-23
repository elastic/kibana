/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RequestHandler,
  RouteConfig,
  kibanaResponseFactory,
} from '../../../../../../src/core/server';
import { Authentication } from '../../authentication';
import { defineLoggedOutRoutes } from './logged_out';

import { coreMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';

describe('LoggedOut view routes', () => {
  let authc: jest.Mocked<Authentication>;
  let routeHandler: RequestHandler<any, any, any, 'get'>;
  let routeConfig: RouteConfig<any, any, any, 'get'>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    authc = routeParamsMock.authc;

    defineLoggedOutRoutes(routeParamsMock);

    const [
      loggedOutRouteConfig,
      loggedOutRouteHandler,
    ] = routeParamsMock.router.get.mock.calls.find(
      ([{ path }]) => path === '/security/logged_out'
    )!;

    routeConfig = loggedOutRouteConfig;
    routeHandler = loggedOutRouteHandler;
  });

  it('correctly defines route.', () => {
    expect(routeConfig.options).toEqual({ authRequired: false });
    expect(routeConfig.validate).toBe(false);
  });

  it('redirects user to the root page if they have a session already.', async () => {
    authc.getSessionInfo.mockResolvedValue({
      provider: 'basic',
      now: 0,
      idleTimeoutExpiration: null,
      lifespanExpiration: null,
    });

    const request = httpServerMock.createKibanaRequest();

    await expect(routeHandler({} as any, request, kibanaResponseFactory)).resolves.toEqual({
      options: { headers: { location: '/mock-server-basepath/' } },
      status: 302,
    });

    expect(authc.getSessionInfo).toHaveBeenCalledWith(request);
  });

  it('renders view if user does not have an active session.', async () => {
    authc.getSessionInfo.mockResolvedValue(null);

    const request = httpServerMock.createKibanaRequest();
    const contextMock = coreMock.createRequestHandlerContext();

    await expect(
      routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
    ).resolves.toEqual({
      options: {
        headers: {
          'content-security-policy':
            "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
        },
      },
      status: 200,
    });

    expect(authc.getSessionInfo).toHaveBeenCalledWith(request);
    expect(contextMock.rendering.render).toHaveBeenCalledWith({ includeUserSettings: false });
  });
});
