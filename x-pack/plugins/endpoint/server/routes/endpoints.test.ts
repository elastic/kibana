/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter, KibanaResponseFactory, RequestHandlerContext } from 'kibana/server';
import { httpServiceMock } from '../../../../../src/core/server/http/http_service.mock';
import { httpServerMock } from '../../../../../src/core/server/http/http_server.mocks';
import { registerEndpointsApi } from './endpoints';

describe('Endpoints Route Test', () => {
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
    registerEndpointsApi(routerMock);
    const [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/endpoints')
    );

    const mockContext = {
      endpointPlugin: {
        findEndpoint: jest.fn((endpointId: string) => ({ id: endpointId })),
      },
    };
    await routeHandler(
      (mockContext as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(routeConfig.options).toEqual({ authRequired: false });
    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: { id: 'endpoint_id' } });
  });

  it('route find all endpoints', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {},
      params: {},
    });
    registerEndpointsApi(routerMock);
    const [routeConfig, routeHandler] = routerMock.get.mock.calls.find(
      ([{ path }]) => path === '/api/endpoint/endpoints'
    );

    const mockContext = {
      endpointPlugin: {
        findLatestOfAllEndpoint: jest.fn(() => ({ id: 'all' })),
      },
    };
    await routeHandler(
      (mockContext as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(routeConfig.options).toEqual({ authRequired: false });
    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: { id: 'all' } });
  });
});
