/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/server/mocks';
import { getRequestValidation } from '@kbn/core-http-server';
import type {
  RequestHandler,
  RouteConfig,
  KibanaRequest,
  RequestHandlerContext,
} from '@kbn/core/server';

import { requestMock } from './request';
import { responseMock as responseFactoryMock } from './response';
import { requestContextMock } from './request_context';
import { responseAdapter } from './test_adapters';
import type { RegisteredVersionedRoute } from '@kbn/core-http-router-server-mocks';

interface Route {
  validate: RouteConfig<
    unknown,
    unknown,
    unknown,
    'get' | 'post' | 'delete' | 'patch' | 'put'
  >['validate'];
  handler: RequestHandler;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

const getClassicRoute = (routerMock: MockServer['router']): Route | undefined => {
  const method = HTTP_METHODS.find((m) => routerMock[m].mock.calls.length > 0);
  if (!method) {
    return undefined;
  }

  const [config, handler] = routerMock[method].mock.calls[0];
  return { validate: config.validate, handler };
};

const getVersionedRoute = (router: MockServer['router']): Route => {
  const method = HTTP_METHODS.find((m) => router.versioned[m].mock.calls.length > 0);
  if (!method) {
    throw new Error('No route registered!');
  }
  const config = router.versioned[method].mock.calls[0][0];
  const routePath = config.path;

  const route: RegisteredVersionedRoute = router.versioned.getRoute(method, routePath);
  const firstVersion = Object.values(route.versions)[0];

  return {
    validate:
      firstVersion.config.validate === false
        ? false
        : firstVersion.config.validate.request || false,
    handler: firstVersion.handler,
  };
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

    await this.getRoute().handler(context, validatedRequest, this.responseMock);
    return responseAdapter(this.responseMock);
  }

  private getRoute(): Route {
    return getClassicRoute(this.router) ?? getVersionedRoute(this.router);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private maybeValidate(part: any, validator?: any): any {
    return typeof validator === 'function' ? validator(part, this.resultMock) : part;
  }

  private validateRequest(request: KibanaRequest): KibanaRequest {
    const route = this.getRoute();
    if (!route.validate) {
      return request;
    }

    const validations = getRequestValidation(route.validate);

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
