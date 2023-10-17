/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/server/mocks';
import type {
  IRouter,
  RouteMethod,
  RequestHandler,
  RouteConfig,
  KibanaRequest,
} from '@kbn/core/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { RouterMock } from '@kbn/core-http-router-server-mocks';
import type { AddVersionOpts, VersionedRouteConfig } from '@kbn/core-http-server';

import { requestMock } from './request';
import { responseMock as responseFactoryMock } from './response';
import { requestContextMock } from './request_context';
import { responseAdapter } from './test_adapters';

interface Route {
  config: RouteConfig<unknown, unknown, unknown, 'get' | 'post' | 'delete' | 'patch' | 'put'>;
  handler: RequestHandler;
}

interface RegisteredVersionedRoute {
  routeConfig: VersionedRouteConfig<RouterMethod>;
  versionConfig: AddVersionOpts<any, any, any>;
  routeHandler: RequestHandler<any, any, any, any, any>;
}

type RouterMethod = Extract<keyof IRouter, RouteMethod>;

export const getRegisteredVersionedRouteMock = (
  routerMock: RouterMock,
  method: RouterMethod,
  path: string,
  version: string
): RegisteredVersionedRoute => {
  const route = routerMock.versioned.getRoute(method, path);
  const routeVersion = route.versions[version];

  if (!routeVersion) {
    throw new Error(`Handler for [${method}][${path}] with version [${version}] no found!`);
  }

  return {
    routeConfig: route.config,
    versionConfig: routeVersion.config,
    routeHandler: routeVersion.handler,
  };
};

const getRoute = (routerMock: MockServer['router'], request: KibanaRequest): Route => {
  const routeCalls = [
    ...routerMock.get.mock.calls,
    ...routerMock.post.mock.calls,
    ...routerMock.put.mock.calls,
    ...routerMock.patch.mock.calls,
    ...routerMock.delete.mock.calls,
  ];

  const versionedRouteCalls = [
    ...routerMock.versioned.get.mock.calls,
    ...routerMock.versioned.post.mock.calls,
    ...routerMock.versioned.put.mock.calls,
    ...routerMock.versioned.patch.mock.calls,
    ...routerMock.versioned.delete.mock.calls,
  ];

  const [route] = routeCalls;
  const [versionedRoute] = versionedRouteCalls;

  if (!route && !versionedRoute) {
    throw new Error('No route registered!');
  }
  console.log(3, '00000-----', versionedRoute, request.headers.version);

  if (versionedRoute && typeof request.headers.version === 'string') {
    const { routeConfig, routeHandler, versionConfig } = getRegisteredVersionedRouteMock(
      routerMock,
      request.route.method,
      request.route.path,
      request.headers.version
    );

    return { config: { ...routeConfig, ...versionConfig }, handler: routeHandler };
  } else {
    const [config, handler] = route;
    return { config, handler };
  }
};

const buildResultMock = () => ({ ok: jest.fn((x) => x), badRequest: jest.fn((x) => x) });

class MockServer {
  constructor(
    public readonly router = httpServiceMock.createRouter(),
    private responseMock = responseFactoryMock.create(),
    private contextMock = requestContextMock.convertContext(requestContextMock.create()),
    private resultMock = buildResultMock()
  ) {}

  public validate(request: KibanaRequest) {
    this.validateRequest(request);
    return this.resultMock;
  }

  public async inject(request: KibanaRequest, context: RequestHandlerContext = this.contextMock) {
    console.log(request.route.method, request.route.path, request.headers.version, '------');

    const validatedRequest = this.validateRequest(request);

    console.log(2, '------');

    const [rejection] = this.resultMock.badRequest.mock.calls;
    if (rejection) {
      throw new Error(`Request was rejected with message: '${rejection}'`);
    }

    await this.getRoute(validatedRequest).handler(context, validatedRequest, this.responseMock);

    return responseAdapter(this.responseMock);
  }

  private getRoute(request: KibanaRequest): Route {
    return getRoute(this.router, request);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private maybeValidate(part: any, validator?: any): any {
    return typeof validator === 'function' ? validator(part, this.resultMock) : part;
  }

  private validateRequest(request: KibanaRequest): KibanaRequest {
    const config = this.getRoute(request).config;
    console.log('--validateRequest---', config);
    const validations = config.validate.request;
    if (!validations) {
      return request;
    }

    const validatedRequest = requestMock.create({
      path: request.route.path,
      method: request.route.method,
      headers: config.version ? { version: config.version } : {},
      body: this.maybeValidate(request.body, validations.body),
      query: this.maybeValidate(request.query, validations.query),
      params: this.maybeValidate(request.params, validations.params),
    });

    return validatedRequest;
  }
}
const createMockServer = () => new MockServer();

export const serverMock = {
  create: createMockServer,
};
