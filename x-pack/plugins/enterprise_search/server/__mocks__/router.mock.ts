/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import {
  IRouter,
  KibanaRequest,
  RequestHandlerContext,
  RouteValidatorConfig,
} from 'src/core/server';

/**
 * Test helper that mocks Kibana's router and DRYs out various helper (callRoute, schema validation)
 */

type MethodType = 'get' | 'post' | 'put' | 'patch' | 'delete';
type PayloadType = 'params' | 'query' | 'body';

interface IMockRouterProps {
  method: MethodType;
  path: string;
  payload?: PayloadType;
}
interface IMockRouterRequest {
  body?: object;
  query?: object;
  params?: object;
}
type TMockRouterRequest = KibanaRequest | IMockRouterRequest;

export class MockRouter {
  public router!: jest.Mocked<IRouter>;
  public method: MethodType;
  public path: string;
  public payload?: PayloadType;
  public response = httpServerMock.createResponseFactory();

  constructor({ method, path, payload }: IMockRouterProps) {
    this.createRouter();
    this.method = method;
    this.path = path;
    this.payload = payload;
  }

  public createRouter = () => {
    this.router = httpServiceMock.createRouter();
  };

  public callRoute = async (request: TMockRouterRequest) => {
    const routerCalls = this.router[this.method].mock.calls as any[];
    if (!routerCalls.length) throw new Error('No routes registered.');

    const route = routerCalls.find(([router]: any) => router.path === this.path);
    if (!route) throw new Error('No matching registered routes found - check method/path keys');

    const [, handler] = route;
    const context = {} as jest.Mocked<RequestHandlerContext>;
    await handler(context, httpServerMock.createKibanaRequest(request as any), this.response);
  };

  /**
   * Schema validation helpers
   */

  public validateRoute = (request: TMockRouterRequest) => {
    if (!this.payload) throw new Error('Cannot validate wihout a payload type specified.');

    const [config] = this.router[this.method].mock.calls[0];
    const validate = config.validate as RouteValidatorConfig<{}, {}, {}>;

    const payloadValidation = validate[this.payload] as { validate(request: KibanaRequest): void };
    const payloadRequest = request[this.payload] as KibanaRequest;

    payloadValidation.validate(payloadRequest);
  };

  public shouldValidate = (request: TMockRouterRequest) => {
    expect(() => this.validateRoute(request)).not.toThrow();
  };

  public shouldThrow = (request: TMockRouterRequest) => {
    expect(() => this.validateRoute(request)).toThrow();
  };
}

/**
 * Example usage:
 */
// const mockRouter = new MockRouter({
//   method: 'get',
//   path: '/api/app_search/test',
//   payload: 'body'
// });
//
// beforeEach(() => {
//   jest.clearAllMocks();
//   mockRouter.createRouter();
//
//   registerExampleRoute({ router: mockRouter.router, ...dependencies }); // Whatever other dependencies the route needs
// });

// it('hits the endpoint successfully', async () => {
//   await mockRouter.callRoute({ body: { foo: 'bar' } });
//
//   expect(mockRouter.response.ok).toHaveBeenCalled();
// });

// it('validates', () => {
//   const request = { body: { foo: 'bar' } };
//   mockRouter.shouldValidate(request);
// });
