/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import type { IRouter, RouteMethod, RequestHandler, KibanaRequest } from '@kbn/core/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { RouterMock } from '@kbn/core-http-router-server-mocks';
import type { AddVersionOpts, VersionedRouteConfig } from '@kbn/core-http-server';

import { requestMock } from './request';
import { responseMock as responseFactoryMock } from './response';
import { requestContextMock } from './request_context';
import { responseAdapter } from './test_adapters';

interface Route {
  config: AddVersionOpts<unknown, unknown, unknown>;
  handler: RequestHandler;
}

interface RegisteredVersionedRoute {
  routeConfig: VersionedRouteConfig<RouterMethod>;
  versionConfig: AddVersionOpts<unknown, unknown, unknown>;
  routeHandler: RequestHandler;
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
  const versionedRouteCalls = [
    ...routerMock.versioned.get.mock.calls,
    ...routerMock.versioned.post.mock.calls,
    ...routerMock.versioned.put.mock.calls,
    ...routerMock.versioned.patch.mock.calls,
    ...routerMock.versioned.delete.mock.calls,
  ];

  const [versionedRoute] = versionedRouteCalls;

  if (!versionedRoute) {
    throw new Error('No route registered!');
  }

  const { routeHandler, versionConfig } = getRegisteredVersionedRouteMock(
    routerMock,
    request.route.method,
    request.route.path,
    '1'
  );

  return { config: versionConfig, handler: routeHandler };
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
    const validatedRequest = this.validateRequest(request);
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
    const validations = config.validate
      ? typeof config.validate === 'function'
        ? config.validate().request
        : config.validate.request
      : undefined;
    if (!validations) {
      return request;
    }

    const validatedRequest = requestMock.create({
      path: request.route.path,
      method: request.route.method,
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
