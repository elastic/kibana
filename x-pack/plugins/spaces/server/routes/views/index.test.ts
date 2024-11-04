/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Type } from '@kbn/config-schema';
import type {
  HttpResources,
  HttpResourcesRequestHandler,
  RequestHandlerContext,
  RouteConfig,
} from '@kbn/core/server';
import {
  coreMock,
  httpResourcesMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import type { ViewRouteDeps } from '.';
import { initSpacesViewsRoutes } from '.';
import { ENTER_SPACE_PATH } from '../../../common';

const routeDefinitionParamsMock = {
  create: () => {
    uiSettingsServiceMock.createStartContract();

    return {
      basePath: httpServiceMock.createBasePath(),
      logger: loggingSystemMock.create().get(),
      httpResources: httpResourcesMock.createRegistrar(),
    } as unknown as DeeplyMockedKeys<ViewRouteDeps>;
  },
};

describe('Space Selector view routes', () => {
  let httpResources: jest.Mocked<HttpResources>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    httpResources = routeParamsMock.httpResources;

    initSpacesViewsRoutes(routeParamsMock);
  });

  let routeHandler: HttpResourcesRequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, 'get'>;
  beforeEach(() => {
    const [viewRouteConfig, viewRouteHandler] = httpResources.register.mock.calls.find(
      ([{ path }]) => path === '/spaces/space_selector'
    )!;

    routeConfig = viewRouteConfig;
    routeHandler = viewRouteHandler;
  });

  it('correctly defines route.', () => {
    expect(routeConfig.options).toEqual({ excludeFromOAS: true });
    expect(routeConfig.validate).toBe(false);
  });

  it('renders view.', async () => {
    const request = httpServerMock.createKibanaRequest();
    const responseFactory = httpResourcesMock.createResponseFactory();

    await routeHandler({} as unknown as RequestHandlerContext, request, responseFactory);

    expect(responseFactory.renderCoreApp).toHaveBeenCalledWith();
  });
});

describe('Enter Space view routes', () => {
  let httpResources: jest.Mocked<HttpResources>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    httpResources = routeParamsMock.httpResources;

    initSpacesViewsRoutes(routeParamsMock);
  });

  let routeHandler: HttpResourcesRequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, 'get'>;
  beforeEach(() => {
    const [viewRouteConfig, viewRouteHandler] = httpResources.register.mock.calls.find(
      ([{ path }]) => path === ENTER_SPACE_PATH
    )!;

    routeConfig = viewRouteConfig;
    routeHandler = viewRouteHandler;
  });

  it('correctly defines route.', () => {
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

  const testCase = (
    description: string,
    {
      query,
      defaultRoute,
      expectedLocation,
    }: { query?: Record<string, string>; defaultRoute?: string; expectedLocation: string }
  ) => {
    it(description, async () => {
      const request = httpServerMock.createKibanaRequest({
        query,
      });

      const responseFactory = httpResourcesMock.createResponseFactory();
      const contextMock = coreMock.createRequestHandlerContext();
      contextMock.uiSettings.client.get.mockResolvedValue(defaultRoute);

      await routeHandler(
        { core: contextMock } as unknown as RequestHandlerContext,
        request,
        responseFactory
      );

      expect(responseFactory.redirected).toHaveBeenCalledWith({
        headers: { location: expectedLocation },
      });
    });
  };

  testCase('correctly enters space default route.', {
    defaultRoute: '/home',
    expectedLocation: '/mock-server-basepath/home',
  });

  testCase('correctly enters space with specified route.', {
    query: {
      next: '/app/management/kibana/objects',
    },
    expectedLocation: '/mock-server-basepath/app/management/kibana/objects',
  });

  testCase('correctly enters space with specified route without leading slash.', {
    query: {
      next: 'app/management/kibana/objects',
    },
    expectedLocation: '/mock-server-basepath/app/management/kibana/objects',
  });

  testCase('correctly enters space with default route if specified route is not relative.', {
    query: {
      next: 'http://evil.com/mock-server-basepath/app/kibana',
    },
    defaultRoute: '/home',
    expectedLocation: '/mock-server-basepath/home',
  });

  describe('specified route normalization', () => {
    for (const { query, expectedLocation } of [
      {
        query: {
          next: '/app/../app/management/kibana/objects',
        },
        expectedLocation: '/mock-server-basepath/app/management/kibana/objects',
      },
      {
        query: {
          next: '../../app/../app/management/kibana/objects',
        },
        expectedLocation: '/mock-server-basepath/app/management/kibana/objects',
      },
      {
        query: {
          next: '/../../app/home',
        },
        expectedLocation: '/mock-server-basepath/app/home',
      },
      {
        query: {
          next: '/app/management/kibana/objects/../../kibana/home',
        },
        expectedLocation: '/mock-server-basepath/app/management/kibana/home',
      },
      {
        query: {
          next: '/app/management/kibana/objects?initialQuery=type:(visualization)',
        },
        expectedLocation:
          '/mock-server-basepath/app/management/kibana/objects?initialQuery=type:(visualization)',
      },
    ]) {
      testCase(`url ${query.next}`, { query, expectedLocation });
    }
  });

  describe('default route', () => {
    for (const { defaultRoute, expectedLocation, query, testCaseName } of [
      {
        defaultRoute: '/home',
        expectedLocation: '/mock-server-basepath/home',
        testCaseName: 'correctly enters space with default route.',
      },
      {
        defaultRoute: '/home',
        expectedLocation: '/mock-server-basepath/home',
        testCaseName: 'correctly enters space with default route if specified url is empty string.',
        query: { next: '' },
      },
      {
        defaultRoute: '/home/#view',
        expectedLocation: '/mock-server-basepath/home/#view',
        testCaseName: 'correctly enters space with default route preserving url hash.',
      },
      {
        defaultRoute: '/home?initialQuery=type:(visualization)',
        expectedLocation: '/mock-server-basepath/home?initialQuery=type:(visualization)',
        testCaseName: 'correctly enters space with default route preserving url search.',
      },
      {
        defaultRoute: '/app/discover?initialQuery=type:(visualization)#/view/uuid',
        expectedLocation:
          '/mock-server-basepath/app/discover?initialQuery=type:(visualization)#/view/uuid',
        testCaseName: 'correctly enters space with default route preserving url search and hash.',
      },
      {
        defaultRoute: '../../app/../app/management/kibana/objects',
        expectedLocation: '/mock-server-basepath/app/management/kibana/objects',
        testCaseName: 'correctly enters space with default route normalizing url.',
      },
    ]) {
      testCase(testCaseName, { query, defaultRoute, expectedLocation });
    }
  });
});
