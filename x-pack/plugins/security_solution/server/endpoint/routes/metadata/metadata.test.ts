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
} from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { HostInfo, HostStatus, MetadataListResponse } from '../../../../common/endpoint/types';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { registerEndpointRoutes } from '.';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import {
  EndpointAppContextService,
  EndpointAppContextServiceStartContract,
} from '../../endpoint_app_context_services';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { Agent, ElasticsearchAssetType } from '@kbn/fleet-plugin/common/types/models';
import {
  legacyMetadataSearchResponseMock,
  unitedMetadataSearchResponseMock,
} from './support/test_support';
import type { AgentClient, PackageService, PackageClient } from '@kbn/fleet-plugin/server';
import {
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  metadataCurrentIndexPattern,
  metadataTransformPrefix,
  METADATA_TRANSFORMS_STATUS_ROUTE,
  METADATA_UNITED_INDEX,
} from '../../../../common/endpoint/constants';
import { TRANSFORM_STATES } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { AgentNotFoundError, PackagePolicyServiceInterface } from '@kbn/fleet-plugin/server';
import {
  ClusterClientMock,
  ScopedClusterClientMock,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '@kbn/core/server/elasticsearch/client/mocks';
import { EndpointHostNotFoundError } from '../../services/metadata';
import { FleetAgentGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_generator';
import { createMockAgentClient, createMockPackageService } from '@kbn/fleet-plugin/server/mocks';
import { TransformGetTransformStatsResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz';

class IndexNotFoundException extends Error {
  meta: { body: { error: { type: string } } };

  constructor() {
    super();
    this.meta = { body: { error: { type: 'index_not_found_exception' } } };
  }
}

describe('test endpoint routes', () => {
  let routerMock: jest.Mocked<SecuritySolutionPluginRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: ClusterClientMock;
  let mockScopedClient: ScopedClusterClientMock;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockPackageService: PackageService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeHandler: RequestHandler<any, any, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeConfig: RouteConfig<any, any, any, any>;
  // tests assume that fleet is enabled, and thus agentService is available
  let mockAgentService: Required<
    ReturnType<typeof createMockEndpointAppContextServiceStartContract>
  >['agentService'];
  let mockAgentPolicyService: Required<
    ReturnType<typeof createMockEndpointAppContextServiceStartContract>
  >['agentPolicyService'];
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
      startContract.packagePolicyService as jest.Mocked<PackagePolicyServiceInterface>
    ).list.mockImplementation(() => {
      return Promise.resolve({
        items: [],
        total: 0,
        page: 1,
        perPage: 1000,
      });
    });

    endpointAppContextService = new EndpointAppContextService();
    mockPackageService = createMockPackageService();
    const mockPackageClient = mockPackageService.asInternalUser as jest.Mocked<PackageClient>;
    mockPackageClient.getInstallation.mockResolvedValue({
      installed_kibana: [],
      package_assets: [],
      es_index_patterns: {},
      name: '',
      version: '',
      install_status: 'installed',
      install_version: '',
      install_started_at: '',
      install_source: 'registry',
      installed_es: [
        {
          id: 'logs-endpoint.events.security',
          type: ElasticsearchAssetType.indexTemplate,
        },
        {
          id: `${metadataTransformPrefix}-0.16.0-dev.0`,
          type: ElasticsearchAssetType.transform,
        },
      ],
      keep_policies_up_to_date: false,
    });
    endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextService.start({ ...startContract, packageService: mockPackageService });
    mockAgentService = startContract.agentService!;
    mockAgentClient = createMockAgentClient();
    mockAgentService.asScoped = () => mockAgentClient;
    mockAgentPolicyService = startContract.agentPolicyService!;

    registerEndpointRoutes(routerMock, {
      logFactory: loggingSystemMock.create(),
      service: endpointAppContextService,
      config: () => Promise.resolve(createMockConfig()),
      experimentalFeatures: parseExperimentalConfigValue(createMockConfig().enableExperimental),
    });
  });

  afterEach(() => endpointAppContextService.stop());

  describe('GET list endpoints route', () => {
    describe('with .metrics-endpoint.metadata_united_default index', () => {
      it('should fallback to legacy index if index not found', async () => {
        const mockRequest = httpServerMock.createKibanaRequest({
          query: {
            page: 0,
            pageSize: 10,
          },
        });
        const response = legacyMetadataSearchResponseMock(
          new EndpointDocGenerator().generateHostMetadata()
        );
        const esSearchMock = mockScopedClient.asInternalUser.search;
        esSearchMock
          .mockImplementationOnce(() => {
            throw new IndexNotFoundException();
          })
          .mockResponseImplementationOnce(() => ({ body: response }));
        [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
          path.startsWith(HOST_METADATA_LIST_ROUTE)
        )!;
        mockAgentClient.getAgentStatusById.mockResolvedValue('error');
        mockAgentClient.listAgents.mockResolvedValue(noUnenrolledAgent);
        await routeHandler(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
          mockRequest,
          mockResponse
        );

        // should be called twice, united index first, then legacy index
        expect(esSearchMock).toHaveBeenCalledTimes(2);
        expect(esSearchMock.mock.calls[0][0]?.index).toEqual(METADATA_UNITED_INDEX);
        expect(esSearchMock.mock.calls[1][0]?.index).toEqual(metadataCurrentIndexPattern);
        expect(routeConfig.options).toEqual({
          authRequired: true,
          tags: ['access:securitySolution'],
        });
        expect(mockResponse.ok).toBeCalled();
        const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as MetadataListResponse;
        expect(endpointResultList.data.length).toEqual(1);
        expect(endpointResultList.total).toEqual(1);
        expect(endpointResultList.page).toEqual(0);
        expect(endpointResultList.pageSize).toEqual(10);
      });

      it('should return expected metadata', async () => {
        const mockRequest = httpServerMock.createKibanaRequest({
          query: {
            page: 0,
            pageSize: 10,
            hostStatuses: ['updating'],
            kuery: 'not host.ip:10.140.73.246',
          },
        });

        mockAgentClient.getAgentStatusById.mockResolvedValue('error');
        mockAgentClient.listAgents.mockResolvedValue(noUnenrolledAgent);
        mockAgentPolicyService.getByIds = jest.fn().mockResolvedValueOnce([]);
        const metadata = new EndpointDocGenerator().generateHostMetadata();
        const esSearchMock = mockScopedClient.asInternalUser.search;
        // @ts-expect-error incorrect type
        esSearchMock.mockResponseOnce(undefined);
        esSearchMock.mockResponseOnce(unitedMetadataSearchResponseMock(metadata));
        [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
          path.startsWith(HOST_METADATA_LIST_ROUTE)
        )!;

        await routeHandler(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
          mockRequest,
          mockResponse
        );

        expect(esSearchMock).toHaveBeenCalledTimes(2);
        expect(esSearchMock.mock.calls[0][0]?.index).toEqual(METADATA_UNITED_INDEX);
        expect(esSearchMock.mock.calls[0][0]?.size).toEqual(1);
        expect(esSearchMock.mock.calls[1][0]?.index).toEqual(METADATA_UNITED_INDEX);
        // @ts-expect-error partial definition
        expect(esSearchMock.mock.calls[1][0]?.body?.query).toEqual({
          bool: {
            must: [
              {
                bool: {
                  filter: [
                    {
                      terms: {
                        'united.agent.policy_id': [],
                      },
                    },
                    {
                      exists: {
                        field: 'united.endpoint.agent.id',
                      },
                    },
                    {
                      exists: {
                        field: 'united.agent.agent.id',
                      },
                    },
                    {
                      term: {
                        'united.agent.active': {
                          value: true,
                        },
                      },
                    },
                  ],
                  must_not: {
                    terms: {
                      'agent.id': [
                        '00000000-0000-0000-0000-000000000000',
                        '11111111-1111-1111-1111-111111111111',
                      ],
                    },
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        filter: [
                          {
                            bool: {
                              should: [
                                {
                                  exists: {
                                    field: 'united.agent.upgrade_started_at',
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
                                  should: [
                                    {
                                      exists: {
                                        field: 'united.agent.upgraded_at',
                                      },
                                    },
                                  ],
                                  minimum_should_match: 1,
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must_not: {
                          bool: {
                            should: [
                              {
                                exists: {
                                  field: 'united.agent.last_checkin',
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            exists: {
                              field: 'united.agent.unenrollment_started_at',
                            },
                          },
                        ],
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
      });
    });

    describe('with metrics-endpoint.metadata_current_default index', () => {
      it('test find the latest of all endpoints', async () => {
        const mockRequest = httpServerMock.createKibanaRequest({
          query: {
            page: 0,
            pageSize: 10,
          },
        });
        const response = legacyMetadataSearchResponseMock(
          new EndpointDocGenerator().generateHostMetadata()
        );
        const esSearchMock = mockScopedClient.asInternalUser.search;
        esSearchMock
          .mockImplementationOnce(() => {
            throw new IndexNotFoundException();
          })
          .mockResponseOnce(response);
        [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
          path.startsWith(HOST_METADATA_LIST_ROUTE)
        )!;
        mockAgentClient.getAgentStatusById.mockResolvedValue('error');
        mockAgentClient.listAgents.mockResolvedValue(noUnenrolledAgent);
        await routeHandler(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
          mockRequest,
          mockResponse
        );

        expect(esSearchMock).toHaveBeenCalledTimes(2);
        expect(routeConfig.options).toEqual({
          authRequired: true,
          tags: ['access:securitySolution'],
        });
        expect(mockResponse.ok).toBeCalled();
        const endpointResultList = mockResponse.ok.mock.calls[0][0]?.body as MetadataListResponse;
        expect(endpointResultList.data.length).toEqual(1);
        expect(endpointResultList.total).toEqual(1);
        expect(endpointResultList.page).toEqual(0);
        expect(endpointResultList.pageSize).toEqual(10);
      });

      it('test find the latest of all endpoints with paging properties', async () => {
        const mockRequest = httpServerMock.createKibanaRequest({
          query: {
            page: 1,
            pageSize: 10,
          },
        });
        const esSearchMock = mockScopedClient.asInternalUser.search;

        mockAgentClient.getAgentStatusById.mockResolvedValue('error');
        mockAgentClient.listAgents.mockResolvedValue(noUnenrolledAgent);
        esSearchMock
          .mockImplementationOnce(() => {
            throw new IndexNotFoundException();
          })
          .mockResponseOnce(
            legacyMetadataSearchResponseMock(new EndpointDocGenerator().generateHostMetadata())
          );
        [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
          path.startsWith(HOST_METADATA_LIST_ROUTE)
        )!;

        await routeHandler(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
          mockRequest,
          mockResponse
        );
        expect(esSearchMock).toHaveBeenCalledTimes(2);
        // @ts-expect-error partial definition
        expect(esSearchMock.mock.calls[1][0]?.body?.query.bool.must_not).toContainEqual({
          terms: {
            'elastic.agent.id': [
              '00000000-0000-0000-0000-000000000000',
              '11111111-1111-1111-1111-111111111111',
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
        expect(endpointResultList.total).toEqual(1);
        expect(endpointResultList.page).toEqual(1);
        expect(endpointResultList.pageSize).toEqual(10);
      });

      it('test find the latest of all endpoints with paging and filters properties', async () => {
        const mockRequest = httpServerMock.createKibanaRequest({
          query: {
            page: 1,
            pageSize: 10,
            kuery: 'not host.ip:10.140.73.246',
          },
        });
        const esSearchMock = mockScopedClient.asInternalUser.search;

        mockAgentClient.getAgentStatusById.mockResolvedValue('error');
        mockAgentClient.listAgents.mockResolvedValue(noUnenrolledAgent);
        esSearchMock
          .mockImplementationOnce(() => {
            throw new IndexNotFoundException();
          })
          .mockResponseOnce(
            legacyMetadataSearchResponseMock(new EndpointDocGenerator().generateHostMetadata())
          );
        [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
          path.startsWith(HOST_METADATA_LIST_ROUTE)
        )!;

        await routeHandler(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
          mockRequest,
          mockResponse
        );

        expect(esSearchMock).toBeCalled();
        expect(
          // KQL filter to be passed through
          // @ts-expect-error partial definition
          esSearchMock.mock.calls[1][0]?.body?.query.bool.must
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
        // @ts-expect-error partial definition
        expect(esSearchMock.mock.calls[1][0]?.body?.query.bool.must).toContainEqual({
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
                  // here we DO want to see both schemas are present
                  // to make this schema-compatible forward and back
                  'HostDetails.elastic.agent.id': [
                    '00000000-0000-0000-0000-000000000000',
                    '11111111-1111-1111-1111-111111111111',
                  ],
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
        expect(endpointResultList.total).toEqual(1);
        expect(endpointResultList.page).toEqual(1);
        expect(endpointResultList.pageSize).toEqual(10);
      });
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

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(HOST_METADATA_GET_ROUTE)
      )!;
      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
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

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(HOST_METADATA_GET_ROUTE)
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
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
      const response = legacyMetadataSearchResponseMock(
        new EndpointDocGenerator().generateHostMetadata()
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: response.hits.hits[0]._id },
      });
      const esSearchMock = mockScopedClient.asInternalUser.search;

      mockAgentClient.getAgent.mockRejectedValue(new AgentNotFoundError('not found'));

      esSearchMock.mockResponseOnce(response);

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(HOST_METADATA_GET_ROUTE)
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
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

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(HOST_METADATA_GET_ROUTE)
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(routeConfig.options).toEqual({
        authRequired: true,
        tags: ['access:securitySolution'],
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

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(HOST_METADATA_GET_ROUTE)
      )!;

      await routeHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(esSearchMock).toHaveBeenCalledTimes(1);
      expect(mockResponse.badRequest).toBeCalled();
    });
  });

  describe('GET metadata transform stats route', () => {
    it('should get forbidden if no fleet access', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();

      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(METADATA_TRANSFORMS_STATUS_ROUTE)
      )!;

      const contextOverrides = {
        endpointAuthz: getEndpointAuthzInitialStateMock({ canAccessEndpointManagement: false }),
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
      [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(METADATA_TRANSFORMS_STATUS_ROUTE)
      )!;
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
