/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ILegacyClusterClient,
  IRouter,
  ILegacyScopedClusterClient,
  KibanaResponseFactory,
  RequestHandler,
  RouteConfig,
  SavedObjectsClientContract,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../../../src/core/server/mocks';
import {
  HostInfo,
  HostMetadata,
  HostResultList,
  HostStatus,
} from '../../../../common/endpoint/types';
import { SearchResponse } from 'elasticsearch';
import { registerEndpointRoutes } from './index';
import {
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import Boom from 'boom';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { Agent } from '../../../../../ingest_manager/common/types/models';

describe('test endpoint route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: jest.Mocked<ILegacyClusterClient>;
  let mockScopedClient: jest.Mocked<ILegacyScopedClusterClient>;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeHandler: RequestHandler<any, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeConfig: RouteConfig<any, any, any, any>;
  // tests assume that ingestManager is enabled, and thus agentService is available
  let mockAgentService: Required<
    ReturnType<typeof createMockEndpointAppContextServiceStartContract>
  >['agentService'];
  let endpointAppContextService: EndpointAppContextService;
  const noUnenrolledAgent = {
    agents: [],
    total: 0,
    page: 1,
    perPage: 1,
  };

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient() as jest.Mocked<
      ILegacyClusterClient
    >;
    mockScopedClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    endpointAppContextService = new EndpointAppContextService();
    const startContract = createMockEndpointAppContextServiceStartContract();
    endpointAppContextService.start(startContract);
    mockAgentService = startContract.agentService!;

    registerEndpointRoutes(routerMock, {
      logFactory: loggingSystemMock.create(),
      service: endpointAppContextService,
      config: () => Promise.resolve(createMockConfig()),
    });
  });

  afterEach(() => endpointAppContextService.stop());

  it('test find the latest of all endpoints', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({});
    const response = createSearchResponse(new EndpointDocGenerator().generateHostMetadata());
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/metadata')
    )!;
    mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('error');
    mockAgentService.listAgents = jest.fn().mockReturnValue(noUnenrolledAgent);
    await routeHandler(
      createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
    expect(routeConfig.options).toEqual({ authRequired: true, tags: ['access:securitySolution'] });
    expect(mockResponse.ok).toBeCalled();
    const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as HostResultList;
    expect(endpointResultList.hosts.length).toEqual(1);
    expect(endpointResultList.total).toEqual(1);
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
    mockAgentService.listAgents = jest.fn().mockReturnValue(noUnenrolledAgent);
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve(createSearchResponse(new EndpointDocGenerator().generateHostMetadata()))
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/metadata')
    )!;

    await routeHandler(
      createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockScopedClient.callAsCurrentUser.mock.calls[0][1]?.body?.query).toEqual({
      match_all: {},
    });
    expect(routeConfig.options).toEqual({ authRequired: true, tags: ['access:securitySolution'] });
    expect(mockResponse.ok).toBeCalled();
    const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as HostResultList;
    expect(endpointResultList.hosts.length).toEqual(1);
    expect(endpointResultList.total).toEqual(1);
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
    mockAgentService.listAgents = jest.fn().mockReturnValue(noUnenrolledAgent);
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve(createSearchResponse(new EndpointDocGenerator().generateHostMetadata()))
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
        must: [
          {
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
          },
        ],
      },
    });
    expect(routeConfig.options).toEqual({ authRequired: true, tags: ['access:securitySolution'] });
    expect(mockResponse.ok).toBeCalled();
    const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as HostResultList;
    expect(endpointResultList.hosts.length).toEqual(1);
    expect(endpointResultList.total).toEqual(1);
    expect(endpointResultList.request_page_index).toEqual(10);
    expect(endpointResultList.request_page_size).toEqual(10);
  });

  describe('Endpoint Details route', () => {
    it('should return 404 on no results', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({ params: { id: 'BADID' } });

      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
        Promise.resolve(createSearchResponse())
      );

      mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('error');
      mockAgentService.getAgent = jest.fn().mockReturnValue(({
        active: true,
      } as unknown) as Agent);

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
      )!;
      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.notFound).toBeCalled();
      const message = mockResponse.notFound.mock.calls[0][0]?.body;
      expect(message).toEqual('Endpoint Not Found');
    });

    it('should return a single endpoint with status online', async () => {
      const response = createSearchResponse(new EndpointDocGenerator().generateHostMetadata());
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });

      mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('online');
      mockAgentService.getAgent = jest.fn().mockReturnValue(({
        active: true,
      } as unknown) as Agent);
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result).toHaveProperty('metadata.Endpoint');
      expect(result.host_status).toEqual(HostStatus.ONLINE);
    });

    it('should return a single endpoint with status error when AgentService throw 404', async () => {
      const response = createSearchResponse(new EndpointDocGenerator().generateHostMetadata());

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });

      mockAgentService.getAgentStatusById = jest.fn().mockImplementation(() => {
        throw Boom.notFound('Agent not found');
      });

      mockAgentService.getAgent = jest.fn().mockImplementation(() => {
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

      expect(mockScopedClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result.host_status).toEqual(HostStatus.ERROR);
    });

    it('should return a single endpoint with status error when status is not offline or online', async () => {
      const response = createSearchResponse(new EndpointDocGenerator().generateHostMetadata());

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });

      mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('warning');
      mockAgentService.getAgent = jest.fn().mockReturnValue(({
        active: true,
      } as unknown) as Agent);
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result.host_status).toEqual(HostStatus.ERROR);
    });

    it('should throw error when endpoint egent is not active', async () => {
      const response = createSearchResponse(new EndpointDocGenerator().generateHostMetadata());

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
      mockAgentService.getAgent = jest.fn().mockReturnValue(({
        active: false,
      } as unknown) as Agent);

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith('/api/endpoint/metadata')
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockResponse.customError).toBeCalled();
    });
  });
});

function createSearchResponse(hostMetadata?: HostMetadata): SearchResponse<HostMetadata> {
  return ({
    took: 15,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 5,
        relation: 'eq',
      },
      max_score: null,
      hits: hostMetadata
        ? [
            {
              _index: 'metrics-endpoint.metadata-default',
              _id: '8FhM0HEBYyRTvb6lOQnw',
              _score: null,
              _source: hostMetadata,
              sort: [1588337587997],
              inner_hits: {
                most_recent: {
                  hits: {
                    total: {
                      value: 2,
                      relation: 'eq',
                    },
                    max_score: null,
                    hits: [
                      {
                        _index: 'metrics-endpoint.metadata-default',
                        _id: 'W6Vo1G8BYQH1gtPUgYkC',
                        _score: null,
                        _source: hostMetadata,
                        sort: [1579816615336],
                      },
                    ],
                  },
                },
              },
            },
          ]
        : [],
    },
    aggregations: {
      total: {
        value: 1,
      },
    },
  } as unknown) as SearchResponse<HostMetadata>;
}
