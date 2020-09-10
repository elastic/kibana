/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { getHostPolicyResponseHandler } from './handlers';
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

describe('test policy response handler', () => {
  let endpointAppContextService: EndpointAppContextService;
  let mockScopedClient: jest.Mocked<ILegacyScopedClusterClient>;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;

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
      params: { hostId: 'id' },
    });

    await hostPolicyResponseHandler(
      createRouteHandlerContext(mockScopedClient, mockSavedObjectClient),
      mockRequest,
      mockResponse
    );

    expect(mockResponse.ok).toBeCalled();
    const result = mockResponse.ok.mock.calls[0][0]?.body as GetHostPolicyResponse;
    expect(result.policy_response.host.id).toEqual(response.hits.hits[0]._source.host.id);
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
      params: { hostId: 'id' },
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
