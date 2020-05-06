/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { IRouter, RequestHandlerContext, RouteValidatorConfig } from 'src/core/server';

/**
 * Test helper that mocks Kibana's router and DRYs out various helper (callRoute, schema validation)
 */

type methodType = 'get' | 'post' | 'put' | 'patch' | 'delete';
type payloadType = 'params' | 'query' | 'body';

export class MockRouter {
  public router: jest.Mocked<IRouter>;
  public method: methodType;
  public payload: payloadType;
  public response = httpServerMock.createResponseFactory();

  private constructor({ method, payload }) {
    this.createRouter();
    this.method = method;
    this.payload = payload;
  }

  public createRouter = () => {
    this.router = httpServiceMock.createRouter();
  };

  public callRoute = async request => {
    const [_, handler] = this.router[this.method].mock.calls[0];

    const context = {} as jest.Mocked<RequestHandlerContext>;
    await handler(context, httpServerMock.createKibanaRequest(request), this.response);
  };

  /**
   * Schema validation helpers
   */

  public validateRoute = request => {
    const [config] = this.router[this.method].mock.calls[0];
    const validate = config.validate as RouteValidatorConfig<{}, {}, {}>;

    validate[this.payload].validate(request[this.payload]);
  };

  public shouldValidate = request => {
    expect(() => this.validateRoute(request)).not.toThrow();
  };

  public shouldThrow = request => {
    expect(() => this.validateRoute(request)).toThrow();
  };
}

/**
 * Example usage:
 */
// const mockRouter = new MockRouter({ method: 'get', payload: 'body' });
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
