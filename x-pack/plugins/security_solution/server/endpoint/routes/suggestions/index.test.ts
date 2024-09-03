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
  httpServiceMock,
} from '@kbn/core/server/mocks';
import type {
  KibanaResponseFactory,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { ConfigSchema } from '@kbn/unified-search-plugin/server/config';
import type { Observable } from 'rxjs';
import { dataPluginMock } from '@kbn/unified-search-plugin/server/mocks';
import { termsEnumSuggestions } from '@kbn/unified-search-plugin/server/autocomplete/terms_enum';
import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
  getRegisteredVersionedRouteMock,
} from '../../mocks';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import { applyActionsEsSearchMock } from '../../services/actions/mocks';
import { requestContextMock } from '../../../lib/detection_engine/routes/__mocks__';
import type { EndpointSuggestionsSchema } from '../../../../common/api/endpoint';
import {
  getEndpointSuggestionsRequestHandler,
  registerEndpointSuggestionsRoutes,
  getLogger,
} from '.';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { eventsIndexPattern, SUGGESTIONS_ROUTE } from '../../../../common/endpoint/constants';
import { EndpointAppContextService } from '../../endpoint_app_context_services';

jest.mock('@kbn/unified-search-plugin/server/autocomplete/terms_enum', () => {
  return {
    termsEnumSuggestions: jest.fn(),
  };
});

const termsEnumSuggestionsMock = termsEnumSuggestions as jest.Mock;

interface CallRouteInterface {
  params: TypeOf<typeof EndpointSuggestionsSchema.params>;
  authz?: Partial<EndpointAuthz>;
}

describe('when calling the Suggestions route handler', () => {
  let mockScopedEsClient: ScopedClusterClientMock;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let suggestionsRouteHandler: ReturnType<typeof getEndpointSuggestionsRequestHandler>;
  let callRoute: (
    routePrefix: string,
    opts: CallRouteInterface,
    indexExists?: { endpointDsExists: boolean }
  ) => Promise<void>;

  let config$: Observable<ConfigSchema>;

  beforeEach(() => {
    const mockContext = createMockEndpointAppContext();
    (mockContext.service.getEndpointMetadataService as jest.Mock) = jest.fn().mockReturnValue({
      findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
    });
    mockScopedEsClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();

    config$ = dataPluginMock
      .createSetupContract()
      .autocomplete.getInitializerContextConfig()
      .create();
    suggestionsRouteHandler = getEndpointSuggestionsRequestHandler(config$, getLogger(mockContext));
  });

  describe('having right privileges', () => {
    it('should call service using event filters type from request', async () => {
      applyActionsEsSearchMock(mockScopedEsClient.asInternalUser);

      const mockContext = requestContextMock.convertContext(
        createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
      );

      const fieldName = 'process.id';
      const mockRequest = httpServerMock.createKibanaRequest<
        TypeOf<typeof EndpointSuggestionsSchema.params>,
        never,
        never
      >({
        params: { suggestion_type: 'eventFilters' },
        body: {
          field: 'process.id',
          query: 'test-query',
          filters: 'test-filters',
          fieldMeta: 'test-field-meta',
        },
      });

      await suggestionsRouteHandler(mockContext, mockRequest, mockResponse);

      expect(termsEnumSuggestionsMock).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        eventsIndexPattern,
        fieldName,
        'test-query',
        'test-filters',
        'test-field-meta',
        expect.any(Object)
      );

      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should respond with bad request if wrong suggestion type', async () => {
      applyActionsEsSearchMock(
        mockScopedEsClient.asInternalUser,
        new EndpointActionGenerator().toEsSearchResponse([])
      );

      const mockContext = requestContextMock.convertContext(
        createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
      );
      const mockRequest = httpServerMock.createKibanaRequest<
        TypeOf<typeof EndpointSuggestionsSchema.params>,
        never,
        never
      >({
        params: { suggestion_type: 'any' },
      });

      await suggestionsRouteHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: 'Invalid suggestion_type: any',
      });
    });
  });
  describe('without having right privileges', () => {
    beforeEach(() => {
      const startContract = createMockEndpointAppContextServiceStartContract();
      const routerMock = httpServiceMock.createRouter();
      const endpointAppContextService = new EndpointAppContextService();
      // add the suggestions route handlers to routerMock
      registerEndpointSuggestionsRoutes(routerMock, config$, {
        ...createMockEndpointAppContext(),
        service: endpointAppContextService,
      });

      // define a convenience function to execute an API call for a given route
      callRoute = async (
        routePrefix: string,
        { params, authz = {} }: CallRouteInterface
      ): Promise<void> => {
        const superUser = {
          username: 'superuser',
          roles: ['superuser'],
        };
        (startContract.security.authc.getCurrentUser as jest.Mock).mockImplementationOnce(
          () => superUser
        );

        const ctx = createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient);

        ctx.securitySolution.getEndpointAuthz.mockResolvedValue(
          getEndpointAuthzInitialStateMock(authz)
        );

        const mockRequest = httpServerMock.createKibanaRequest({ params });
        const { routeHandler } = getRegisteredVersionedRouteMock(
          routerMock,
          'post',
          routePrefix,
          '2023-10-31'
        );

        await routeHandler(ctx as unknown as RequestHandlerContext, mockRequest, mockResponse);
      };
    });

    it('should respond with forbidden', async () => {
      await callRoute(SUGGESTIONS_ROUTE, {
        params: { suggestion_type: 'eventFilters' },
        authz: { canReadEventFilters: true, canWriteEventFilters: false },
      });

      expect(mockResponse.forbidden).toBeCalled();
    });
  });
});
