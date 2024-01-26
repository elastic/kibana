/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { getHostPolicyResponseHandler, getAgentPolicySummaryHandler } from './handlers';
import type { KibanaResponseFactory, SavedObjectsClientContract } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { GetHostPolicyResponse, HostPolicyResponse } from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { requestContextMock } from '../../../lib/detection_engine/routes/__mocks__';
import type { Agent } from '@kbn/fleet-plugin/common/types/models';
import type { AgentClient } from '@kbn/fleet-plugin/server/services';
import { get } from 'lodash';
import type { ScopedClusterClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

describe('test policy response handler', () => {
  let endpointAppContextService: EndpointAppContextService;
  let mockScopedClient: ScopedClusterClientMock;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;

  describe('test policy response handler', () => {
    beforeEach(() => {
      mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
      mockSavedObjectClient = savedObjectsClientMock.create();
      mockResponse = httpServerMock.createResponseFactory();
      endpointAppContextService = new EndpointAppContextService();
      endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
      endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());
    });

    afterEach(() => endpointAppContextService.stop());

    it('should return the latest policy response for a host', async () => {
      const response = createSearchResponse(new EndpointDocGenerator().generatePolicyResponse());
      const hostPolicyResponseHandler = getHostPolicyResponseHandler();

      mockScopedClient.asInternalUser.search.mockResponseOnce(response);
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { agentId: 'id' },
      });

      await hostPolicyResponseHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as GetHostPolicyResponse;
      expect(result.policy_response.agent.id).toEqual(
        get(response, 'hits.hits.0._source.agent.id')
      );
    });

    it('should return not found when there is no response policy for host', async () => {
      const hostPolicyResponseHandler = getHostPolicyResponseHandler();

      mockScopedClient.asInternalUser.search.mockResponseOnce(createSearchResponse());

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { agentId: 'id' },
      });

      await hostPolicyResponseHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.notFound).toBeCalled();
      const message = mockResponse.notFound.mock.calls[0][0]?.body;
      expect(message).toEqual('Policy Response Not Found');
    });
  });

  describe('test agent policy summary handler', () => {
    let mockAgentClient: jest.Mocked<AgentClient>;

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
      mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
      mockSavedObjectClient = savedObjectsClientMock.create();
      mockResponse = httpServerMock.createResponseFactory();
      endpointAppContextService = new EndpointAppContextService();
      emptyAgentListResult = {
        agents: [],
        total: 2,
        page: 1,
        perPage: 1,
      };

      agentListResult = {
        agents: [
          {
            local_metadata: {
              elastic: {
                agent: {
                  version: '8.0.0',
                },
              },
            },
          } as unknown as Agent,
          {
            local_metadata: {
              elastic: {
                agent: {
                  version: '8.0.0',
                },
              },
            },
          } as unknown as Agent,
          {
            local_metadata: {
              elastic: {
                agent: {
                  version: '8.1.0',
                },
              },
            },
          } as unknown as Agent,
        ],
        total: 2,
        page: 1,
        perPage: 1,
      };
      endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
      endpointAppContextService.start({
        ...createMockEndpointAppContextServiceStartContract(),
      });
      mockAgentClient = endpointAppContextService.getInternalFleetServices()
        .agent as jest.Mocked<AgentClient>;
    });

    afterEach(() => endpointAppContextService.stop());

    it('should return the summary of all the agent with the given policy name', async () => {
      mockAgentClient.listAgents
        .mockImplementation(() => Promise.resolve(emptyAgentListResult))
        .mockImplementationOnce(() => Promise.resolve(agentListResult));

      const policySummarysHandler = getAgentPolicySummaryHandler({
        ...createMockEndpointAppContext(),
        service: endpointAppContextService,
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        query: { policy_id: '41a1b470-221b-11eb-8fba-fb9c0d46ace3', package_name: 'endpoint' },
      });

      await policySummarysHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );
      expect(mockResponse.ok).toBeCalled();
      expect(mockResponse.ok.mock.calls[0][0]?.body).toEqual({
        summary_response: {
          policy_id: '41a1b470-221b-11eb-8fba-fb9c0d46ace3',
          package: 'endpoint',
          versions_count: { '8.0.0': 2, '8.1.0': 1 },
        },
      });
    });

    it('should return the agent summary', async () => {
      mockAgentClient.listAgents
        .mockImplementationOnce(() => Promise.resolve(agentListResult))
        .mockImplementationOnce(() => Promise.resolve(emptyAgentListResult));

      const agentPolicySummaryHandler = getAgentPolicySummaryHandler({
        ...createMockEndpointAppContext(),
        service: endpointAppContextService,
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        query: { package_name: 'endpoint' },
      });

      await agentPolicySummaryHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
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
): estypes.SearchResponse<HostPolicyResponse> {
  return {
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
  } as unknown as estypes.SearchResponse<HostPolicyResponse>;
}
