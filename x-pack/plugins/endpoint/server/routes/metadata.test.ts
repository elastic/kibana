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
import { HostMetadata, HostResultList } from '../../common/types';
import { SearchResponse } from 'elasticsearch';
import { registerEndpointRoutes } from './metadata';
import { EndpointConfigSchema } from '../config';
import * as data from '../test_data/all_metadata_data.json';

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

    const response: SearchResponse<HostMetadata> = (data as unknown) as SearchResponse<
      HostMetadata
    >;
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/metadata')
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
    const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as HostResultList;
    expect(endpointResultList.hosts.length).toEqual(2);
    expect(endpointResultList.total).toEqual(2);
    expect(endpointResultList.request_page_index).toEqual(0);
    expect(endpointResultList.request_page_size).toEqual(10);
  });

  it('test find the latest of all endpoints with paging properties', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        paging_properties: [
          {
            page_size: 10,
          },
          {
            page_index: 1,
          },
        ],
      },
    });
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve((data as unknown) as SearchResponse<HostMetadata>)
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/metadata')
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
    expect(mockScopedClient.callAsCurrentUser.mock.calls[0][1]?.body?.query).toEqual({
      match_all: {},
    });
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as HostResultList;
    expect(endpointResultList.hosts.length).toEqual(2);
    expect(endpointResultList.total).toEqual(2);
    expect(endpointResultList.request_page_index).toEqual(10);
    expect(endpointResultList.request_page_size).toEqual(10);
  });

  it('test find the latest of all endpoints with paging and filters properties', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        paging_properties: [
          {
            page_size: 10,
          },
          {
            page_index: 1,
          },
        ],

        filter: 'not host.ip:10.140.73.246',
      },
    });
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve((data as unknown) as SearchResponse<HostMetadata>)
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/metadata')
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
    expect(mockScopedClient.callAsCurrentUser.mock.calls[0][1]?.body?.query).toEqual({
      bool: {
        must_not: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match: {
                  'host.ip': '10.140.73.246',
                },
              },
            ],
          },
        },
      },
    });
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as HostResultList;
    expect(endpointResultList.hosts.length).toEqual(2);
    expect(endpointResultList.total).toEqual(2);
    expect(endpointResultList.request_page_index).toEqual(10);
    expect(endpointResultList.request_page_size).toEqual(10);
  });

  describe('Endpoint Details route', () => {
    it('should return 404 on no results', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({ params: { id: 'BADID' } });
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
        Promise.resolve({
          took: 3,
          timed_out: false,
          _shards: {
            total: 1,
            successful: 1,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: {
              value: 9,
              relation: 'eq',
            },
            max_score: null,
            hits: [],
          },
        })
      );
      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
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
      expect(mockResponse.notFound).toBeCalled();
      const message = mockResponse.notFound.mock.calls[0][0]?.body;
      expect(message).toEqual('Endpoint Not Found');
    });

    it('should return a single endpoint', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: (data as any).hits.hits[0]._id },
      });
      const response: SearchResponse<HostMetadata> = (data as unknown) as SearchResponse<
        HostMetadata
      >;
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
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
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostMetadata;
      expect(result).toHaveProperty('endpoint');
    });
  });
});
