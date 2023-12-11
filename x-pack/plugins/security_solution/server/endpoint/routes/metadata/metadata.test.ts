/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaResponseFactory,
  RequestHandler,
  RouteMethod,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { HostInfo, MetadataListResponse } from '../../../../common/endpoint/types';
import { HostStatus } from '../../../../common/endpoint/types';
import { registerEndpointRoutes } from '.';
import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
  getRegisteredVersionedRouteMock,
} from '../../mocks';
import type { EndpointAppContextServiceStartContract } from '../../endpoint_app_context_services';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import type { Agent } from '@kbn/fleet-plugin/common/types/models';
import {
  legacyMetadataSearchResponseMock,
  unitedMetadataSearchResponseMock,
} from './support/test_support';
import type {
  AgentClient,
  AgentPolicyServiceInterface,
  PackagePolicyClient,
} from '@kbn/fleet-plugin/server';
import {
  ENDPOINT_DEFAULT_SORT_DIRECTION,
  ENDPOINT_DEFAULT_SORT_FIELD,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  METADATA_TRANSFORMS_STATUS_ROUTE,
  METADATA_UNITED_INDEX,
} from '../../../../common/endpoint/constants';
import { TRANSFORM_STATES } from '../../../../common/constants';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import type {
  ClusterClientMock,
  ScopedClusterClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { EndpointHostNotFoundError } from '../../services/metadata';
import { FleetAgentGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_generator';
import type { TransformGetTransformStatsResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import type { VersionedRouteConfig } from '@kbn/core-http-server';
import type { SecuritySolutionPluginRouterMock } from '../../../mocks';

describe('test endpoint routes', () => {
  let routerMock: SecuritySolutionPluginRouterMock;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: ClusterClientMock;
  let mockScopedClient: ScopedClusterClientMock;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeHandler: RequestHandler<any, any, any, any>;
  let routeConfig: VersionedRouteConfig<RouteMethod>;
  let mockAgentPolicyService: jest.Mocked<AgentPolicyServiceInterface>;
  let mockAgentClient: jest.Mocked<AgentClient>;
  let endpointAppContextService: EndpointAppContextService;
  let startContract: EndpointAppContextServiceStartContract;
  const noUnenrolledAgent = {
    agents: [],
    total: 0,
    page: 1,
    perPage: 1,
  };
  const agentGenerator = new FleetAgentGenerator('seed');

  beforeEach(() => {
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    startContract = createMockEndpointAppContextServiceStartContract();

    (
      startContract.endpointFleetServicesFactory.asInternalUser()
        .packagePolicy as jest.Mocked<PackagePolicyClient>
    ).list.mockImplementation(() => {
      return Promise.resolve({
        items: [],
        total: 0,
        page: 1,
        perPage: 1000,
      });
    });

    endpointAppContextService = new EndpointAppContextService();
    endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextService.start({ ...startContract });
    mockAgentClient = startContract.endpointFleetServicesFactory.asInternalUser()
      .agent as jest.Mocked<AgentClient>;
    mockAgentPolicyService = startContract.endpointFleetServicesFactory.asInternalUser()
      .agentPolicy as jest.Mocked<AgentPolicyServiceInterface>;

    registerEndpointRoutes(routerMock, {
      ...createMockEndpointAppContext(),
      service: endpointAppContextService,
    });
  });

  afterEach(() => endpointAppContextService.stop());

  describe('GET list endpoints route', () => {
    it('should return expected metadata', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        query: {
          page: 0,
          pageSize: 10,
          hostStatuses: ['updating'],
          kuery: 'not host.ip:10.140.73.246',
        },
      });
      mockSavedObjectClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 10,
      });
      mockAgentClient.getAgentStatusById.mockResolvedValue('error');
      mockAgentClient.listAgents.mockResolvedValue(noUnenrolledAgent);
      mockAgentPolicyService.getByIds = jest.fn().mockResolvedValueOnce([]);
      const metadata = new EndpointDocGenerator().generateHostMetadata();
      const esSearchMock = mockScopedClient.asInternalUser.search;
      esSearchMock.mockResponseOnce(unitedMetadataSearchResponseMock(metadata));

      ({ routeHandler, routeConfig } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        HOST_METADATA_LIST_ROUTE,
        '2023-10-31'
      ));

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(esSearchMock.mock.calls[0][0]?.index).toEqual(METADATA_UNITED_INDEX);
      // @ts-expect-error partial definition
      expect(esSearchMock.mock.calls[0][0]?.body?.query).toEqual({
        bool: {
          must: [
            {
              bool: {
                must_not: {
                  terms: {
                    'agent.id': [
                      '00000000-0000-0000-0000-000000000000',
                      '11111111-1111-1111-1111-111111111111',
                    ],
                  },
                },
                filter: [
                  { terms: { 'united.agent.policy_id': [] } },
                  { exists: { field: 'united.endpoint.agent.id' } },
                  { exists: { field: 'united.agent.agent.id' } },
                  { term: { 'united.agent.active': { value: true } } },
                ],
              },
            },
            {
              bool: {
                should: [
                  {
                    bool: {
                      should: [{ match: { status: 'updating' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [{ match: { status: 'unenrolling' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [{ match: { status: 'enrolling' } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                must_not: {
                  bool: {
                    should: [{ match: { 'host.ip': '10.140.73.246' } }],
                    minimum_should_match: 1,
                  },
                },
              },
            },
          ],
        },
      });
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.ok).toBeCalled();
      const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as MetadataListResponse;
      expect(endpointResultList.data.length).toEqual(1);
      expect(endpointResultList.data[0].metadata).toEqual(metadata);
      expect(endpointResultList.total).toEqual(1);
      expect(endpointResultList.page).toEqual(0);
      expect(endpointResultList.pageSize).toEqual(10);
      expect(endpointResultList.sortField).toEqual(ENDPOINT_DEFAULT_SORT_FIELD);
      expect(endpointResultList.sortDirection).toEqual(ENDPOINT_DEFAULT_SORT_DIRECTION);
    });

    it('should get forbidden if no security solution access', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();

      ({ routeHandler, routeConfig } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        HOST_METADATA_LIST_ROUTE,
        '2023-10-31'
      ));

      const contextOverrides = {
        endpointAuthz: getEndpointAuthzInitialStateMock({ canReadSecuritySolution: false }),
      };
      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient, contextOverrides),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.forbidden).toBeCalled();
    });
  });

  describe('GET endpoint details route', () => {
    it('should return 404 on no results', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({ params: { id: 'BADID' } });
      const esSearchMock = mockScopedClient.asInternalUser.search;

      esSearchMock.mockResponseOnce(legacyMetadataSearchResponseMock());

      mockAgentClient.getAgentStatusById.mockResolvedValue('error');
      mockAgentClient.getAgent.mockResolvedValue({
        active: true,
      } as unknown as Agent);

      ({ routeConfig, routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        HOST_METADATA_GET_ROUTE,
        '2023-10-31'
      ));

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
      });
      expect(mockResponse.notFound).toBeCalled();
      const message = mockResponse.notFound.mock.calls[0][0]?.body;
      expect(message).toBeInstanceOf(EndpointHostNotFoundError);
    });

    it('should return a single endpoint with status healthy', async () => {
      const response = legacyMetadataSearchResponseMock(
        new EndpointDocGenerator().generateHostMetadata()
      );
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });
      const esSearchMock = mockScopedClient.asInternalUser.search;

      mockAgentClient.getAgent.mockResolvedValue(agentGenerator.generate({ status: 'online' }));
      esSearchMock.mockResponseOnce(response);

      ({ routeConfig, routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        HOST_METADATA_GET_ROUTE,
        '2023-10-31'
      ));

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
      });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result).toHaveProperty('metadata.Endpoint');
      expect(result.host_status).toEqual(HostStatus.HEALTHY);
    });

    it('should return a single endpoint with status unhealthy when AgentService throw 404', async () => {
      const response = legacyMetadataSearchResponseMock(
        new EndpointDocGenerator().generateHostMetadata()
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });
      const esSearchMock = mockScopedClient.asInternalUser.search;

      mockAgentClient.getAgent.mockRejectedValue(new AgentNotFoundError('not found'));

      esSearchMock.mockResponseOnce(response);

      ({ routeConfig, routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        HOST_METADATA_GET_ROUTE,
        '2023-10-31'
      ));

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
      });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result.host_status).toEqual(HostStatus.UNHEALTHY);
    });

    it('should return a single endpoint with status unhealthy when status is not offline, online or enrolling', async () => {
      const response = legacyMetadataSearchResponseMock(
        new EndpointDocGenerator().generateHostMetadata()
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });
      const esSearchMock = mockScopedClient.asInternalUser.search;

      mockAgentClient.getAgent.mockResolvedValue(
        agentGenerator.generate({
          status: 'error',
        })
      );
      esSearchMock.mockResponseOnce(response);

      ({ routeConfig, routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        HOST_METADATA_GET_ROUTE,
        '2023-10-31'
      ));

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
      });
      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as HostInfo;
      expect(result.host_status).toEqual(HostStatus.UNHEALTHY);
    });

    it('should throw error when endpoint agent is not active', async () => {
      const response = legacyMetadataSearchResponseMock(
        new EndpointDocGenerator().generateHostMetadata()
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });
      const esSearchMock = mockScopedClient.asInternalUser.search;

      esSearchMock.mockResponseOnce(response);
      mockAgentClient.getAgent.mockResolvedValue({
        active: false,
      } as unknown as Agent);

      ({ routeConfig, routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        HOST_METADATA_GET_ROUTE,
        '2023-10-31'
      ));

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(mockResponse.badRequest).toBeCalled();
    });

    it('should work if no security solution access but has fleet access', async () => {
      const response = legacyMetadataSearchResponseMock(
        new EndpointDocGenerator().generateHostMetadata()
      );
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });
      const esSearchMock = mockScopedClient.asInternalUser.search;

      mockAgentClient.getAgent.mockResolvedValue(agentGenerator.generate({ status: 'online' }));
      esSearchMock.mockResponseOnce(response);

      ({ routeConfig, routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        HOST_METADATA_GET_ROUTE,
        '2023-10-31'
      ));

      const contextOverrides = {
        endpointAuthz: getEndpointAuthzInitialStateMock({
          canReadSecuritySolution: false,
        }),
      };
      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient, contextOverrides),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toBeCalled();
    });

    it('should get forbidden if no security solution or fleet access', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();

      ({ routeConfig, routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        HOST_METADATA_GET_ROUTE,
        '2023-10-31'
      ));

      const contextOverrides = {
        endpointAuthz: getEndpointAuthzInitialStateMock({
          canAccessFleet: false,
          canReadSecuritySolution: false,
        }),
      };
      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient, contextOverrides),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.forbidden).toBeCalled();
    });
  });

  describe('GET metadata transform stats route', () => {
    it('should get forbidden if no security solution access', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();

      ({ routeConfig, routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        METADATA_TRANSFORMS_STATUS_ROUTE,
        '2023-10-31'
      ));

      const contextOverrides = {
        endpointAuthz: getEndpointAuthzInitialStateMock({ canReadSecuritySolution: false }),
      };
      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient, contextOverrides),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.forbidden).toBeCalled();
    });

    it('should correctly return metadata transform stats', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();
      const expectedResponse = {
        count: 1,
        transforms: [
          {
            id: 'someid',
            state: TRANSFORM_STATES.STARTED,
          },
        ],
      };
      const esClientMock = mockScopedClient.asInternalUser;
      // @ts-expect-error incomplete type
      esClientMock.transform.getTransformStats.mockResponseOnce(expectedResponse);
      ({ routeConfig, routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        METADATA_TRANSFORMS_STATUS_ROUTE,
        '2023-10-31'
      ));
      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esClientMock.transform.getTransformStats).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
      });
      expect(mockResponse.ok).toBeCalled();
      const response = mockResponse.ok.mock.calls[0][0]?.body as TransformGetTransformStatsResponse;
      expect(response.count).toEqual(expectedResponse.count);
      expect(response.transforms).toEqual(expectedResponse.transforms);
    });
  });
});
