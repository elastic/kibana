/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  IRouter,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  RouteConfig,
} from 'kibana/server';
import { httpServiceMock } from '../../../../../src/core/server/http/http_service.mock';
import { httpServerMock } from '../../../../../src/core/server/http/http_server.mocks';
import { registerEndpointRoutes } from './endpoints';
import { EndpointRequestContext } from '../handlers/endpoint_handler';
import { SearchResponse } from 'elasticsearch';
import { EndpointData } from '../types';

describe('endpoints route test', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any>;

  beforeEach(() => {
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
  });

  it('route find specific endpoint', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {},
      params: { id: 'endpoint_id' },
    });
    const response: SearchResponse<EndpointData> = ({
      id: 'endpoint_id',
    } as unknown) as SearchResponse<EndpointData>;
    const endpointHandler: jest.Mocked<EndpointRequestContext> = {
      findEndpoint: jest.fn(),
      findLatestOfAllEndpoints: jest.fn(),
    };
    endpointHandler.findEndpoint.mockReturnValue(Promise.resolve(response));
    registerEndpointRoutes(routerMock, endpointHandler);
    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/endpoints')
    )!;
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
    const response: SearchResponse<EndpointData> = ({
      id: 'all',
    } as unknown) as SearchResponse<EndpointData>;
    const endpointHandler: jest.Mocked<EndpointRequestContext> = {
      findEndpoint: jest.fn(),
      findLatestOfAllEndpoints: jest.fn(),
    };
    endpointHandler.findLatestOfAllEndpoints.mockReturnValue(Promise.resolve(response));
    registerEndpointRoutes(routerMock, endpointHandler);
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(
      ([{ path }]) => path === '/api/endpoint/endpoints'
    )!;
    await routeHandler(({} as unknown) as RequestHandlerContext, mockRequest, mockResponse);
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({ body: { id: 'all' } });
  });
});
