/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { getHostPolicyResponseHandler } from './handlers';
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
import { get } from 'lodash';
import type { ScopedClusterClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { TypeOf } from '@kbn/config-schema';
import type { GetPolicyResponseSchema } from '../../../../common/api/endpoint';

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
      const hostPolicyResponseHandler = getHostPolicyResponseHandler(endpointAppContextService);

      mockScopedClient.asInternalUser.search.mockResponseOnce(response);
      const mockRequest = httpServerMock.createKibanaRequest<
        never,
        TypeOf<typeof GetPolicyResponseSchema.query>,
        never
      >({
        query: { agentId: 'id' },
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
      const hostPolicyResponseHandler = getHostPolicyResponseHandler(endpointAppContextService);

      mockScopedClient.asInternalUser.search.mockResponseOnce(createSearchResponse());

      const mockRequest = httpServerMock.createKibanaRequest<
        never,
        TypeOf<typeof GetPolicyResponseSchema.query>,
        never
      >({
        query: { agentId: 'foo' },
      });

      await hostPolicyResponseHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: expect.objectContaining({
          message: 'Policy response for endpoint id [foo] not found',
        }),
      });
    });

    it('should retrieve internal fleet services using space id', async () => {
      mockScopedClient.asInternalUser.search.mockResponseOnce(createSearchResponse());
      const getInternalFleetServicesSpy = jest.spyOn(
        endpointAppContextService,
        'getInternalFleetServices'
      );
      const hostPolicyResponseHandler = getHostPolicyResponseHandler(endpointAppContextService);
      const mockRequest = httpServerMock.createKibanaRequest<
        never,
        TypeOf<typeof GetPolicyResponseSchema.query>,
        never
      >({
        query: { agentId: 'foo' },
      });
      const mockContext = requestContextMock.convertContext(
        createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
      );
      ((await mockContext.securitySolution).getSpaceId as jest.Mock).mockReturnValue('foo');
      await hostPolicyResponseHandler(mockContext, mockRequest, mockResponse);

      expect(getInternalFleetServicesSpy).toHaveBeenCalledWith('foo');
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
