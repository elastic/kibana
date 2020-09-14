/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '@kbn/config-schema';
import {
  RouteConfig,
  HttpResources,
  HttpResourcesRequestHandler,
  RequestHandlerContext,
} from '../../../../../../src/core/server';
import { defineCaptureURLRoutes } from './capture_url';

import { httpResourcesMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';

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
    expect(
      queryValidator.validate({ providerType: 'basic', providerName: 'basic1', next: '/some-url' })
    ).toEqual({ providerType: 'basic', providerName: 'basic1', next: '/some-url' });

    expect(queryValidator.validate({ providerType: 'basic', providerName: 'basic1' })).toEqual({
      providerType: 'basic',
      providerName: 'basic1',
    });

    expect(() => queryValidator.validate({ providerType: '' })).toThrowErrorMatchingInlineSnapshot(
      `"[providerType]: value has length [0] but it must have a minimum length of [1]."`
    );

    expect(() =>
      queryValidator.validate({ providerType: 'basic' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[providerName]: expected value of type [string] but got [undefined]"`
    );

    expect(() => queryValidator.validate({ providerName: '' })).toThrowErrorMatchingInlineSnapshot(
      `"[providerType]: expected value of type [string] but got [undefined]"`
    );

    expect(() =>
      queryValidator.validate({ providerName: 'basic1' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[providerType]: expected value of type [string] but got [undefined]"`
    );

    expect(() =>
      queryValidator.validate({ providerType: 'basic', providerName: '' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[providerName]: value has length [0] but it must have a minimum length of [1]."`
    );

    expect(() =>
      queryValidator.validate({ providerType: '', providerName: 'basic1' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[providerType]: value has length [0] but it must have a minimum length of [1]."`
    );
  });

  it('renders view.', async () => {
    const request = httpServerMock.createKibanaRequest();
    const responseFactory = httpResourcesMock.createResponseFactory();

    await routeHandler(({} as unknown) as RequestHandlerContext, request, responseFactory);

    expect(responseFactory.renderAnonymousCoreApp).toHaveBeenCalledWith();
  });
});
