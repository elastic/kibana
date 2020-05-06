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
  RouteConfig,
  SavedObjectsClientContract,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
  savedObjectsClientMock,
} from '../../../../../../src/core/server/mocks';
import { HostInfo, HostMetadata, HostResultList, HostStatus } from '../../../common/types';
import { SearchResponse } from 'elasticsearch';
import { registerEndpointRoutes } from './index';
import { EndpointConfigSchema } from '../../config';
import * as data from '../../test_data/all_metadata_data.json';
import {
  createMockAgentService,
  createMockMetadataIndexPatternRetriever,
  createRouteHandlerContext,
} from '../../mocks';
import { AgentService } from '../../../../ingest_manager/server';
import Boom from 'boom';
import { EndpointAppContextService } from '../../endpoint_app_context_services';

describe('test endpoint route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;
  let mockAgentService: jest.Mocked<AgentService>;
  let endpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient() as jest.Mocked<
      IClusterClient
    >;
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    mockAgentService = createMockAgentService();
    endpointAppContextService = new EndpointAppContextService();
    endpointAppContextService.start({
      indexPatternRetriever: createMockMetadataIndexPatternRetriever(),
      agentService: mockAgentService,
    });

    registerEndpointRoutes(routerMock, {
      logFactory: loggingServiceMock.create(),
      service: endpointAppContextService,
      config: () => Promise.resolve(EndpointConfigSchema.validate({})),
    });
  });

  afterEach(() => endpointAppContextService.stop());

  it('test find the latest of all endpoints', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({});

    const response: SearchResponse<HostMetadata> = (data as unknown) as SearchResponse<
      HostMetadata
    >;
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/metadata')
    )!;
    mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('error');
    await routeHandler(
      createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
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

    mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('error');
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve((data as unknown) as SearchResponse<HostMetadata>)
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/metadata')
    )!;

    await routeHandler(
      createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
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

    mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('error');
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve((data as unknown) as SearchResponse<HostMetadata>)
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/metadata')
    )!;

    await routeHandler(
      createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
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
      mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('error');
      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
      )!;
      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.callAsCurrentUser).toBeCalled();
      expect(routeConfig.options).toEqual({ authRequired: true });
      expect(mockResponse.notFound).toBeCalled();
      const message = mockResponse.notFound.mock.calls[0][0]?.body;
      expect(message).toEqual('Endpoint Not Found');
    });

    it('should return a single endpoint with status online', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: (data as any).hits.hits[0]._id },
      });
      const response: SearchResponse<HostMetadata> = (data as unknown) as SearchResponse<
        HostMetadata
      >;
      mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('online');
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.callAsCurrentUser).toBeCalled();
      expect(routeConfig.options).toEqual({ authRequired: true });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result).toHaveProperty('metadata.endpoint');
      expect(result.host_status).toEqual(HostStatus.ONLINE);
    });

    it('should return a single endpoint with status error when AgentService throw 404', async () => {
      const response: SearchResponse<HostMetadata> = (data as unknown) as SearchResponse<
        HostMetadata
      >;

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });

      mockAgentService.getAgentStatusById = jest.fn().mockImplementation(() => {
        throw Boom.notFound('Agent not found');
      });
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.callAsCurrentUser).toBeCalled();
      expect(routeConfig.options).toEqual({ authRequired: true });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result.host_status).toEqual(HostStatus.ERROR);
    });

    it('should return a single endpoint with status error when status is not offline or online', async () => {
      const response: SearchResponse<HostMetadata> = (data as unknown) as SearchResponse<
        HostMetadata
      >;

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });

      mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('warning');
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.callAsCurrentUser).toBeCalled();
      expect(routeConfig.options).toEqual({ authRequired: true });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result.host_status).toEqual(HostStatus.ERROR);
    });
  });
});
