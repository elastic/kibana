/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceStartContract,
} from '../../mocks';
import { IRouter, RequestHandler } from 'kibana/server';
import { httpServerMock, httpServiceMock } from '../../../../../../../src/core/server/mocks';
import { registerTrustedAppsRoutes } from './index';
import { TRUSTED_APPS_LIST_API } from '../../../../common/endpoint/constants';
import { GetTrustedAppsListRequest } from '../../../../common/endpoint/types';
import { xpackMocks } from '../../../../../../mocks';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../lists/common/constants';
import { EndpointAppContext } from '../../types';
import { ExceptionListClient } from '../../../../../lists/server';

describe('when invoking endpoint trusted apps route handlers', () => {
  let routerMock: jest.Mocked<IRouter>;
  let endpointAppContextService: EndpointAppContextService;
  let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let exceptionsListClient: jest.Mocked<ExceptionListClient>;
  let endpointAppContext: EndpointAppContext;

  beforeEach(() => {
    routerMock = httpServiceMock.createRouter();
    endpointAppContextService = new EndpointAppContextService();
    const startContract = createMockEndpointAppContextServiceStartContract();
    exceptionsListClient = startContract.exceptionsListService as jest.Mocked<ExceptionListClient>;
    endpointAppContextService.start(startContract);
    endpointAppContext = {
      ...createMockEndpointAppContext(),
      service: endpointAppContextService,
    };
    registerTrustedAppsRoutes(routerMock, endpointAppContext);

    // For use in individual API calls
    context = xpackMocks.createRequestHandlerContext();
    response = httpServerMock.createResponseFactory();
  });

  describe('when fetching list of trusted apps', () => {
    let routeHandler: RequestHandler<undefined, GetTrustedAppsListRequest>;
    const createListRequest = (page: number = 1, perPage: number = 20) => {
      return httpServerMock.createKibanaRequest<undefined, GetTrustedAppsListRequest>({
        path: TRUSTED_APPS_LIST_API,
        method: 'get',
        query: {
          page,
          per_page: perPage,
        },
      });
    };

    beforeEach(() => {
      // Get the registered List handler from the IRouter instance
      [, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(TRUSTED_APPS_LIST_API)
      )!;
    });

    it('should create the Trusted Apps List first', async () => {
      const request = createListRequest();
      await routeHandler(context, request, response);
      expect(exceptionsListClient.createTrustedAppsList).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalled();
    });

    it('should pass pagination query params to exception list service', async () => {
      const request = createListRequest(10, 100);
      const emptyResponse = {
        data: [],
        page: 10,
        per_page: 100,
        total: 0,
      };

      exceptionsListClient.findExceptionListItem.mockResolvedValue(emptyResponse);
      await routeHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: emptyResponse });
      expect(exceptionsListClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        page: 10,
        perPage: 100,
        filter: undefined,
        namespaceType: 'agnostic',
        sortField: 'name',
        sortOrder: 'asc',
      });
    });

    it('should log unexpected error if one occurs', async () => {
      exceptionsListClient.findExceptionListItem.mockImplementation(() => {
        throw new Error('expected error');
      });
      const request = createListRequest(10, 100);
      await routeHandler(context, request, response);
      expect(response.internalError).toHaveBeenCalled();
      expect(endpointAppContext.logFactory.get('trusted_apps').error).toHaveBeenCalled();
    });
  });
});
