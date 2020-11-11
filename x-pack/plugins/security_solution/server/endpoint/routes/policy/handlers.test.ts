/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockAgentService,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { getHostPolicyResponseHandler, getAgentPolicySummaryHandler } from './handlers';
import {
  ILegacyScopedClusterClient,
  KibanaResponseFactory,
  SavedObjectsClientContract,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../../../src/core/server/mocks';
import { SearchResponse } from 'elasticsearch';
import { GetHostPolicyResponse, HostPolicyResponse } from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { Agent } from '../../../../../fleet/common/types/models';
import { AgentService } from '../../../../../fleet/server/services';

describe('test policy response handler', () => {
  let endpointAppContextService: EndpointAppContextService;
  let mockScopedClient: jest.Mocked<ILegacyScopedClusterClient>;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;

  describe('test policy response handler', () => {
    beforeEach(() => {
      mockScopedClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockSavedObjectClient = savedObjectsClientMock.create();
      mockResponse = httpServerMock.createResponseFactory();
      endpointAppContextService = new EndpointAppContextService();
      endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());
    });

    afterEach(() => endpointAppContextService.stop());

    it('should return the latest policy response for a host', async () => {
      const response = createSearchResponse(new EndpointDocGenerator().generatePolicyResponse());
      const hostPolicyResponseHandler = getHostPolicyResponseHandler({
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
      });

      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { agentId: 'id' },
      });

      await hostPolicyResponseHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as GetHostPolicyResponse;
      expect(result.policy_response.agent.id).toEqual(response.hits.hits[0]._source.agent.id);
    });

    it('should return not found when there is no response policy for host', async () => {
      const hostPolicyResponseHandler = getHostPolicyResponseHandler({
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
      });

      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
        Promise.resolve(createSearchResponse())
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { agentId: 'id' },
      });

      await hostPolicyResponseHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.notFound).toBeCalled();
      const message = mockResponse.notFound.mock.calls[0][0]?.body;
      expect(message).toEqual('Policy Response Not Found');
    });
  });

  describe('test agent policy summary handler', () => {
    let mockAgentService: jest.Mocked<AgentService>;

    let agentListResult: {
      agents: Agent[];
      total: number;
      page: number;
      perPage: number;
    };

    let emptyAgentListResult: {
      agents: Agent[];
      total: number;
      page: number;
      perPage: number;
    };

    beforeEach(() => {
      mockScopedClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockSavedObjectClient = savedObjectsClientMock.create();
      mockResponse = httpServerMock.createResponseFactory();
      endpointAppContextService = new EndpointAppContextService();
      mockAgentService = createMockAgentService();
      emptyAgentListResult = {
        agents: [],
        total: 2,
        page: 1,
        perPage: 1,
      };

      agentListResult = {
        agents: [
          ({
            local_metadata: {
              elastic: {
                agent: {
                  version: '8.0.0',
                },
              },
            },
          } as unknown) as Agent,
          ({
            local_metadata: {
              elastic: {
                agent: {
                  version: '8.0.0',
                },
              },
            },
          } as unknown) as Agent,
          ({
            local_metadata: {
              elastic: {
                agent: {
                  version: '8.1.0',
                },
              },
            },
          } as unknown) as Agent,
        ],
        total: 2,
        page: 1,
        perPage: 1,
      };
      endpointAppContextService.start({
        ...createMockEndpointAppContextServiceStartContract(),
        ...{ agentService: mockAgentService },
      });
    });

    afterEach(() => endpointAppContextService.stop());

    it('should return the summary of all the agent with the given policy name', async () => {
      mockAgentService.listAgents
        .mockImplementationOnce(() => Promise.resolve(agentListResult))
        .mockImplementationOnce(() => Promise.resolve(emptyAgentListResult));

      const policySummarysHandler = getAgentPolicySummaryHandler({
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        query: { policy_id: 'my-policy', package_name: 'endpoint' },
      });

      await policySummarysHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );
      expect(mockResponse.ok).toBeCalled();
      expect(mockResponse.ok.mock.calls[0][0]?.body).toEqual({
        summary_response: {
          policy_id: 'my-policy',
          package: 'endpoint',
          versions_count: { '8.0.0': 2, '8.1.0': 1 },
        },
      });
    });

    it('should return the agent summary', async () => {
      mockAgentService.listAgents
        .mockImplementationOnce(() => Promise.resolve(agentListResult))
        .mockImplementationOnce(() => Promise.resolve(emptyAgentListResult));

      const agentPolicySummaryHandler = getAgentPolicySummaryHandler({
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        query: { package_name: 'endpoint' },
      });

      await agentPolicySummaryHandler(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
        mockRequest,
        mockResponse
      );
      expect(mockResponse.ok).toBeCalled();
      expect(mockResponse.ok.mock.calls[0][0]?.body).toEqual({
        summary_response: {
          package: 'endpoint',
          versions_count: { '8.0.0': 2, '8.1.0': 1 },
        },
      });
    });
  });
});

/**
 * Create a SearchResponse with the hostPolicyResponse provided, else return an empty
 * SearchResponse
 * @param hostPolicyResponse
 */
function createSearchResponse(
  hostPolicyResponse?: HostPolicyResponse
): SearchResponse<HostPolicyResponse> {
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
      hits: hostPolicyResponse
        ? [
            {
              _index: 'metrics-endpoint.policy-default-1',
              _id: '8FhM0HEBYyRTvb6lOQnw',
              _score: null,
              _source: hostPolicyResponse,
              sort: [1588337587997],
            },
          ]
        : [],
    },
  } as unknown) as SearchResponse<HostPolicyResponse>;
}
