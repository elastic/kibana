/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  httpServerMock,
} from '@kbn/core/server/mocks';
import type { KibanaResponseFactory, SavedObjectsClientContract } from '@kbn/core/server';
import { createMockEndpointAppContext, createRouteHandlerContext } from '../../mocks';
import { applyActionsEsSearchMock } from '../../services/actions/mocks';
import { requestContextMock } from '../../../lib/detection_engine/routes/__mocks__';
import { getActionDetailsRequestHandler } from './details';
import { NotFoundError } from '../../errors';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import type { ActionDetailsRequestSchema } from '../../../../common/api/endpoint';

describe('when calling the Action Details route handler', () => {
  let mockScopedEsClient: ScopedClusterClientMock;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let actionDetailsRouteHandler: ReturnType<typeof getActionDetailsRequestHandler>;

  beforeEach(() => {
    const mockContext = createMockEndpointAppContext();
    (mockContext.service.getEndpointMetadataService as jest.Mock) = jest.fn().mockReturnValue({
      findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
    });
    mockScopedEsClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();

    actionDetailsRouteHandler = getActionDetailsRequestHandler(mockContext);
  });

  it('should call service using action id from request', async () => {
    applyActionsEsSearchMock(mockScopedEsClient.asInternalUser);

    const mockContext = requestContextMock.convertContext(
      createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
    );

    const mockRequest = httpServerMock.createKibanaRequest<
      TypeOf<typeof ActionDetailsRequestSchema.params>,
      never,
      never
    >({
      params: { action_id: 'a-b-c' },
    });

    await actionDetailsRouteHandler(mockContext, mockRequest, mockResponse);

    expect(mockScopedEsClient.asInternalUser.search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        body: {
          query: {
            bool: {
              filter: expect.arrayContaining([{ term: { action_id: 'a-b-c' } }]),
            },
          },
        },
      }),
      expect.any(Object)
    );

    expect(mockResponse.ok).toHaveBeenCalled();
  });

  it('should respond with 404 if action id not found', async () => {
    applyActionsEsSearchMock(
      mockScopedEsClient.asInternalUser,
      new EndpointActionGenerator().toEsSearchResponse([])
    );

    const mockContext = requestContextMock.convertContext(
      createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
    );
    const mockRequest = httpServerMock.createKibanaRequest<
      TypeOf<typeof ActionDetailsRequestSchema.params>,
      never,
      never
    >({
      params: { action_id: '123' },
    });

    await actionDetailsRouteHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalledWith({
      body: expect.any(NotFoundError),
    });
  });
});
