/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RequestHandler,
  RouteConfig,
  KibanaRequest,
  RequestHandlerContext,
} from '../../../../../../../../src/core/server';
import { httpServiceMock } from '../../../../../../../../src/core/server/mocks';
import { requestContextMock } from './request_context';
import { responseMock as responseFactoryMock } from './response_factory';
import { requestMock } from '.';
import { responseAdapter } from './test_adapters';

interface Route {
  config: RouteConfig<unknown, unknown, unknown, 'get' | 'post' | 'delete' | 'patch' | 'put'>;
  handler: RequestHandler;
}
const getRoute = (routerMock: MockServer['router']): Route => {
  const routeCalls = [
    ...routerMock.get.mock.calls,
    ...routerMock.post.mock.calls,
    ...routerMock.put.mock.calls,
    ...routerMock.patch.mock.calls,
    ...routerMock.delete.mock.calls,
  ];

  const [route] = routeCalls;
  if (!route) {
    throw new Error('No route registered!');
  }

  const [config, handler] = route;
  return { config, handler };
};

const buildResultMock = () => ({ ok: jest.fn((x) => x), badRequest: jest.fn((x) => x) });

class MockServer {
  constructor(
    public readonly router = httpServiceMock.createRouter(),
    private responseMock = responseFactoryMock.create(),
    private contextMock = requestContextMock.create(),
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
    return getRoute(this.router);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private maybeValidate(part: any, validator?: any): any {
    return typeof validator === 'function' ? validator(part, this.resultMock) : part;
  }

  private validateRequest(request: KibanaRequest): KibanaRequest {
    const validations = this.getRoute().config.validate;
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
