/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  IClusterClient,
  IRouter,
  IScopedClusterClient,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  RouteConfig,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { EndpointData } from '../types';
import { SearchResponse } from 'elasticsearch';
import { EndpointResultList, registerEndpointRoutes } from './endpoints';
import { EndpointConfigSchema } from '../config';
import * as data from '../test_data/all_endpoints_data.json';

describe('test endpoint route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient() as jest.Mocked<
      IClusterClient
    >;
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    registerEndpointRoutes(routerMock, {
      logFactory: loggingServiceMock.create(),
      config: () => Promise.resolve(EndpointConfigSchema.validate({})),
    });
  });

  it('test find the latest of all endpoints', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({});

    const response: SearchResponse<EndpointData> = (data as unknown) as SearchResponse<
      EndpointData
    >;
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/endpoints')
    )!;

    await routeHandler(
      ({
        core: {
          elasticsearch: {
            dataClient: mockScopedClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as EndpointResultList;
    expect(endpointResultList.endpoints.length).toEqual(3);
    expect(endpointResultList.total).toEqual(3);
    expect(endpointResultList.requestIndex).toEqual(0);
    expect(endpointResultList.requestPageSize).toEqual(10);
  });

  it('test find the latest of all endpoints with params', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        pagingProperties: [
          {
            pageSize: 10,
          },
          {
            pageIndex: 1,
          },
        ],
      },
    });
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve((data as unknown) as SearchResponse<EndpointData>)
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/endpoints')
    )!;

    await routeHandler(
      ({
        core: {
          elasticsearch: {
            dataClient: mockScopedClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as EndpointResultList;
    expect(endpointResultList.endpoints.length).toEqual(3);
    expect(endpointResultList.total).toEqual(3);
    expect(endpointResultList.requestIndex).toEqual(10);
    expect(endpointResultList.requestPageSize).toEqual(10);
  });
});
