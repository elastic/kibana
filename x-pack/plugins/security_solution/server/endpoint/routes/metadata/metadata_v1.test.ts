/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaResponseFactory,
  RequestHandler,
  RouteConfig,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '../../../../../../../src/core/server';
import {
  ClusterClientMock,
  ScopedClusterClientMock,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../src/core/server/elasticsearch/client/mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../../../src/core/server/mocks';
import {
  HostInfo,
  HostResultList,
  HostStatus,
  MetadataQueryStrategyVersions,
} from '../../../../common/endpoint/types';
import { registerEndpointRoutes, METADATA_REQUEST_V1_ROUTE } from './index';
import {
  createMockEndpointAppContextServiceStartContract,
  createMockPackageService,
  createRouteHandlerContext,
} from '../../mocks';
import {
  EndpointAppContextService,
  EndpointAppContextServiceStartContract,
} from '../../endpoint_app_context_services';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { Agent, EsAssetReference } from '../../../../../fleet/common/types/models';
import { createV1SearchResponse } from './support/test_support';
import { PackageService } from '../../../../../fleet/server/services';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';

describe('test endpoint route v1', () => {
  let routerMock: jest.Mocked<SecuritySolutionPluginRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: ClusterClientMock;
  let mockScopedClient: ScopedClusterClientMock;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockPackageService: jest.Mocked<PackageService>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeHandler: RequestHandler<any, any, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeConfig: RouteConfig<any, any, any, any>;
  // tests assume that fleet is enabled, and thus agentService is available
  let mockAgentService: Required<
    ReturnType<typeof createMockEndpointAppContextServiceStartContract>
  >['agentService'];
  let endpointAppContextService: EndpointAppContextService;
  let startContract: EndpointAppContextServiceStartContract;
  const noUnenrolledAgent = {
    agents: [],
    total: 0,
    page: 1,
    perPage: 1,
  };

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    endpointAppContextService = new EndpointAppContextService();
    mockPackageService = createMockPackageService();
    mockPackageService.getInstalledEsAssetReferences.mockReturnValue(
      Promise.resolve(([] as unknown) as EsAssetReference[])
    );
    startContract = createMockEndpointAppContextServiceStartContract();
    endpointAppContextService.start({ ...startContract, packageService: mockPackageService });
    mockAgentService = startContract.agentService!;

    (startContract.packagePolicyService as jest.Mocked<PackagePolicyServiceInterface>).list.mockImplementation(
      () => {
        return Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          perPage: 1000,
        });
      }
    );

    registerEndpointRoutes(routerMock, {
      logFactory: loggingSystemMock.create(),
      service: endpointAppContextService,
      config: () => Promise.resolve(createMockConfig()),
      experimentalFeatures: parseExperimentalConfigValue(createMockConfig().enableExperimental),
    });
  });

  afterEach(() => endpointAppContextService.stop());

  it('test find the latest of all endpoints', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({});
    const response = createV1SearchResponse(new EndpointDocGenerator().generateHostMetadata());
    (mockScopedClient.asCurrentUser.search as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ body: response })
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith(`${METADATA_REQUEST_V1_ROUTE}`)
    )!;
    mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('error');
    mockAgentService.listAgents = jest.fn().mockReturnValue(noUnenrolledAgent);
    await routeHandler(
      createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
    expect(routeConfig.options).toEqual({ authRequired: true, tags: ['access:securitySolution'] });
    expect(mockResponse.ok).toBeCalled();
    const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as HostResultList;
    expect(endpointResultList.hosts.length).toEqual(1);
    expect(endpointResultList.total).toEqual(1);
    expect(endpointResultList.request_page_index).toEqual(0);
    expect(endpointResultList.request_page_size).toEqual(10);
    expect(endpointResultList.query_strategy_version).toEqual(
      MetadataQueryStrategyVersions.VERSION_1
    );
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
    (mockScopedClient.asCurrentUser.search as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        body: createV1SearchResponse(new EndpointDocGenerator().generateHostMetadata()),
      })
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith(`${METADATA_REQUEST_V1_ROUTE}`)
    )!;

    await routeHandler(
      createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
    expect(
      (mockScopedClient.asCurrentUser.search as jest.Mock).mock.calls[0][0]?.body?.query.bool
        .must_not
    ).toContainEqual({
      terms: {
        'elastic.agent.id': [
          '00000000-0000-0000-0000-000000000000',
          '11111111-1111-1111-1111-111111111111',
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
    expect(endpointResultList.query_strategy_version).toEqual(
      MetadataQueryStrategyVersions.VERSION_1
    );
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

        filters: { kql: 'not host.ip:10.140.73.246' },
      },
    });

    mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('error');
    mockAgentService.listAgents = jest.fn().mockReturnValue(noUnenrolledAgent);
    (mockScopedClient.asCurrentUser.search as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        body: createV1SearchResponse(new EndpointDocGenerator().generateHostMetadata()),
      })
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith(`${METADATA_REQUEST_V1_ROUTE}`)
    )!;

    await routeHandler(
      createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.asCurrentUser.search).toBeCalled();
    // needs to have the KQL filter passed through
    expect(
      (mockScopedClient.asCurrentUser.search as jest.Mock).mock.calls[0][0]?.body?.query.bool.must
    ).toContainEqual({
      bool: {
        must_not: {
          bool: {
            should: [
              {
                match: {
                  'host.ip': '10.140.73.246',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      },
    });
    // and unenrolled should be filtered out.
    expect(
      (mockScopedClient.asCurrentUser.search as jest.Mock).mock.calls[0][0]?.body?.query.bool.must
    ).toContainEqual({
      bool: {
        must_not: [
          {
            terms: {
              'elastic.agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
            },
          },
          {
            terms: {
              // we actually don't care about HostDetails in v1 queries, but
              // harder to set up the expectation to ignore its inclusion succinctly
              'HostDetails.elastic.agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
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
    expect(endpointResultList.query_strategy_version).toEqual(
      MetadataQueryStrategyVersions.VERSION_1
    );
  });

  describe('Endpoint Details route', () => {
    it('should return 404 on no results', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({ params: { id: 'BADID' } });

      (mockScopedClient.asCurrentUser.search as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ body: createV1SearchResponse() })
      );

      mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('error');
      mockAgentService.getAgent = jest.fn().mockReturnValue(({
        active: true,
      } as unknown) as Agent);

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(`${METADATA_REQUEST_V1_ROUTE}`)
      )!;
      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.notFound).toBeCalled();
      const message = mockResponse.notFound.mock.calls[0][0]?.body;
      expect(message).toEqual('Endpoint Not Found');
    });

    it('should return a single endpoint with status healthy', async () => {
      const response = createV1SearchResponse(new EndpointDocGenerator().generateHostMetadata());
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });

      mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('online');
      mockAgentService.getAgent = jest.fn().mockReturnValue(({
        active: true,
      } as unknown) as Agent);
      (mockScopedClient.asCurrentUser.search as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ body: response })
      );

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(`${METADATA_REQUEST_V1_ROUTE}`)
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result).toHaveProperty('metadata.Endpoint');
      expect(result.host_status).toEqual(HostStatus.HEALTHY);
    });

    it('should return a single endpoint with status unhealthy when AgentService throw 404', async () => {
      const response = createV1SearchResponse(new EndpointDocGenerator().generateHostMetadata());

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });

      mockAgentService.getAgentStatusById = jest.fn().mockImplementation(() => {
        SavedObjectsErrorHelpers.createGenericNotFoundError();
      });

      mockAgentService.getAgent = jest.fn().mockImplementation(() => {
        SavedObjectsErrorHelpers.createGenericNotFoundError();
      });

      (mockScopedClient.asCurrentUser.search as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ body: response })
      );

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(`${METADATA_REQUEST_V1_ROUTE}`)
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result.host_status).toEqual(HostStatus.UNHEALTHY);
    });

    it('should return a single endpoint with status unhealthy when status is not offline, online or enrolling', async () => {
      const response = createV1SearchResponse(new EndpointDocGenerator().generateHostMetadata());

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });

      mockAgentService.getAgentStatusById = jest.fn().mockReturnValue('warning');
      mockAgentService.getAgent = jest.fn().mockReturnValue(({
        active: true,
      } as unknown) as Agent);
      (mockScopedClient.asCurrentUser.search as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ body: response })
      );

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(`${METADATA_REQUEST_V1_ROUTE}`)
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result.host_status).toEqual(HostStatus.UNHEALTHY);
    });

    it('should throw error when endpoint agent is not active', async () => {
      const response = createV1SearchResponse(new EndpointDocGenerator().generateHostMetadata());

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });
      (mockScopedClient.asCurrentUser.search as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ body: response })
      );
      mockAgentService.getAgent = jest.fn().mockReturnValue(({
        active: false,
      } as unknown) as Agent);

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(`${METADATA_REQUEST_V1_ROUTE}`)
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockScopedClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
      expect(mockResponse.customError).toBeCalled();
    });
  });
});
