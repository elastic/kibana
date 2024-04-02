/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ElasticsearchClient,
  KibanaResponseFactory,
  RequestHandlerContext,
  SavedObjectsClientContract,
  KibanaRequest,
} from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  httpServerMock,
} from '@kbn/core/server/mocks';

import type { RequestDiagnosticsAdditionalMetrics } from '../../../common/types';

import { getAgentById } from '../../services/agents';
import * as AgentService from '../../services/agents';

import { requestDiagnosticsHandler } from './request_diagnostics_handler';

jest.mock('../../services/agents');

const mockGetAgentById = getAgentById as jest.Mock;

describe('request diagnostics handler', () => {
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockElasticsearchClient: jest.Mocked<ElasticsearchClient>;
  let mockContext: RequestHandlerContext;
  let mockRequest: KibanaRequest<
    { agentId: string },
    undefined,
    { additional_metrics: RequestDiagnosticsAdditionalMetrics[] },
    any
  >;

  beforeEach(() => {
    mockSavedObjectsClient = savedObjectsClientMock.create();
    mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockResponse = httpServerMock.createResponseFactory();
    jest.spyOn(AgentService, 'requestDiagnostics').mockResolvedValue({ actionId: '1' });
    mockContext = {
      core: {
        savedObjects: {
          client: mockSavedObjectsClient,
        },
        elasticsearch: {
          client: {
            asInternalUser: mockElasticsearchClient,
          },
        },
      },
    } as unknown as RequestHandlerContext;
    mockRequest = httpServerMock.createKibanaRequest({
      params: { agentId: 'agent1' },
      body: { additional_metrics: ['CPU'] },
    });
  });

  it('should return ok if agent supports request diagnostics', async () => {
    mockGetAgentById.mockResolvedValueOnce({
      active: true,
      local_metadata: { elastic: { agent: { version: '8.7.0' } } },
    });

    await requestDiagnosticsHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: { actionId: '1' } });
  });

  it('should retur error if agent does not support request diagnostics', async () => {
    mockGetAgentById.mockResolvedValueOnce({
      active: true,
      local_metadata: { elastic: { agent: { version: '8.6.0' } } },
    });

    await requestDiagnosticsHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: { message: 'Agent agent1 does not support request diagnostics action.' },
      statusCode: 400,
    });
  });
});
