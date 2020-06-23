/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpResourcesRequestHandler, RouteConfig } from '../../../../../../src/core/server';
import { Authentication } from '../../authentication';
import { defineLoggedOutRoutes } from './logged_out';

import { httpServerMock, httpResourcesMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';

describe('LoggedOut view routes', () => {
  let authc: jest.Mocked<Authentication>;
  let routeHandler: HttpResourcesRequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, 'get'>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    authc = routeParamsMock.authc;

    defineLoggedOutRoutes(routeParamsMock);

    const [
      loggedOutRouteConfig,
      loggedOutRouteHandler,
    ] = routeParamsMock.httpResources.register.mock.calls.find(
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
      provider: { type: 'basic', name: 'basic' },
      now: 0,
      idleTimeoutExpiration: null,
      lifespanExpiration: null,
    });

    const request = httpServerMock.createKibanaRequest();

    const responseFactory = httpResourcesMock.createResponseFactory();
    await routeHandler({} as any, request, responseFactory);

    expect(responseFactory.redirected).toHaveBeenCalledWith({
      headers: { location: '/mock-server-basepath/' },
    });

    expect(authc.getSessionInfo).toHaveBeenCalledWith(request);
  });

  it('renders view if user does not have an active session.', async () => {
    authc.getSessionInfo.mockResolvedValue(null);

    const request = httpServerMock.createKibanaRequest();
    const responseFactory = httpResourcesMock.createResponseFactory();
    await routeHandler({} as any, request, responseFactory);

    expect(authc.getSessionInfo).toHaveBeenCalledWith(request);
    expect(responseFactory.renderAnonymousCoreApp).toHaveBeenCalledWith();
  });
});
