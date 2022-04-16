/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Type } from '@kbn/config-schema';
import type { HttpResources, HttpResourcesRequestHandler, RouteConfig } from '@kbn/core/server';
import { httpResourcesMock, httpServerMock } from '@kbn/core/server/mocks';

import type { SecurityRequestHandlerContext } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineCaptureURLRoutes } from './capture_url';

describe('Capture URL view routes', () => {
  let httpResources: jest.Mocked<HttpResources>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    httpResources = routeParamsMock.httpResources;

    defineCaptureURLRoutes(routeParamsMock);
  });

  let routeHandler: HttpResourcesRequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, 'get'>;
  beforeEach(() => {
    const [viewRouteConfig, viewRouteHandler] = httpResources.register.mock.calls.find(
      ([{ path }]) => path === '/internal/security/capture-url'
    )!;

    routeConfig = viewRouteConfig;
    routeHandler = viewRouteHandler;
  });

  it('correctly defines route.', () => {
    expect(routeConfig.options).toEqual({ authRequired: false });

    expect(routeConfig.validate).toEqual({
      body: undefined,
      query: expect.any(Type),
      params: undefined,
    });

    const queryValidator = (routeConfig.validate as any).query as Type<any>;
    expect(queryValidator.validate({})).toEqual({});
    expect(queryValidator.validate({ next: '/some-url', something: 'something' })).toEqual({
      next: '/some-url',
    });
  });

  it('renders view.', async () => {
    const request = httpServerMock.createKibanaRequest();
    const responseFactory = httpResourcesMock.createResponseFactory();

    await routeHandler({} as unknown as SecurityRequestHandlerContext, request, responseFactory);

    expect(responseFactory.renderAnonymousCoreApp).toHaveBeenCalledWith();
  });
});
