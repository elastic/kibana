/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter, KibanaResponseFactory, RequestHandlerContext } from 'kibana/server';
import { httpServiceMock } from '../../../../../src/core/server/http/http_service.mock';
import { httpServerMock } from '../../../../../src/core/server/http/http_server.mocks';
import { registerEndpointRoutes } from './endpoints';
import { EndpointRequestContext } from '../handlers/endpoint_handler';

describe('endpoints route test', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;

  beforeEach(() => {
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
  });

  it('route find specific endpoint', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {},
      params: { id: 'endpoint_id' },
    });
    const endpointHandler: jest.Mocked<EndpointRequestContext> = {
      findEndpoint: jest.fn((endpointId: string) => ({ id: endpointId })),
    };
    registerEndpointRoutes(routerMock, endpointHandler);
    const [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/endpoints')
    );

    await routeHandler(({} as unknown) as RequestHandlerContext, mockRequest, mockResponse);
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: { id: 'endpoint_id' } });
  });

  it('route find all endpoints', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {},
      params: {},
    });
    const endpointHandler: jest.Mocked<EndpointRequestContext> = {
      findLatestOfAllEndpoints: jest.fn(() => ({ id: 'all' })),
    };
    registerEndpointRoutes(routerMock, endpointHandler);
    const [routeConfig, routeHandler] = routerMock.get.mock.calls.find(
      ([{ path }]) => path === '/api/endpoint/endpoints'
    );
    await routeHandler(({} as unknown) as RequestHandlerContext, mockRequest, mockResponse);
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: { id: 'all' } });
  });
});
