/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory } from '@kbn/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { EndpointActionListRequestQuery } from '../../../../common/api/endpoint';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../common/endpoint/constants';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
  getRegisteredVersionedRouteMock,
} from '../../mocks';
import { registerActionListRoutes } from './list';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import { doesLogsEndpointActionsIndexExist } from '../../utils';
import { getActionList, getActionListByStatus } from '../../services';

jest.mock('../../utils');
const mockDoesLogsEndpointActionsIndexExist = doesLogsEndpointActionsIndexExist as jest.Mock;

jest.mock('../../services');
const mockGetActionList = getActionList as jest.Mock;
const mockGetActionListByStatus = getActionListByStatus as jest.Mock;

describe('Action List Handler', () => {
  let endpointAppContextService: EndpointAppContextService;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;

  let actionListHandler: (
    query?: EndpointActionListRequestQuery
  ) => Promise<jest.Mocked<KibanaResponseFactory>>;

  beforeEach(() => {
    const esClientMock = elasticsearchServiceMock.createScopedClusterClient();
    const routerMock = httpServiceMock.createRouter();
    endpointAppContextService = new EndpointAppContextService();
    endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());
    mockDoesLogsEndpointActionsIndexExist.mockResolvedValue(true);

    registerActionListRoutes(routerMock, createMockEndpointAppContext());

    actionListHandler = async (
      query?: EndpointActionListRequestQuery
    ): Promise<jest.Mocked<KibanaResponseFactory>> => {
      const req = httpServerMock.createKibanaRequest({
        query,
      });
      mockResponse = httpServerMock.createResponseFactory();

      const { routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        BASE_ENDPOINT_ACTION_ROUTE,
        '2023-10-31'
      );

      await routeHandler(
        coreMock.createCustomRequestHandlerContext(
          createRouteHandlerContext(esClientMock, savedObjectsClientMock.create())
        ) as SecuritySolutionRequestHandlerContext,
        req,
        mockResponse
      );

      return mockResponse;
    };
  });

  afterEach(() => {
    endpointAppContextService.stop();
  });

  describe('Internals', () => {
    const defaultParams = { pageSize: 10, page: 1 };
    it('should return `notFound` when actions index does not exist', async () => {
      mockDoesLogsEndpointActionsIndexExist.mockResolvedValue(false);
      await actionListHandler(defaultParams);
      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: 'index_not_found_exception',
      });
    });

    it('should return `ok` when actions index exists', async () => {
      await actionListHandler(defaultParams);
      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should call `getActionListByStatus` when statuses filter values are provided', async () => {
      await actionListHandler({ ...defaultParams, statuses: ['failed', 'pending'] });
      expect(mockGetActionListByStatus).toBeCalledWith(
        expect.objectContaining({ statuses: ['failed', 'pending'] })
      );
    });

    it('should correctly format the request when calling `getActionListByStatus`', async () => {
      await actionListHandler({
        withOutputs: 'actionX',
        agentIds: 'agentX',
        commands: 'running-processes',
        statuses: 'failed',
        userIds: 'userX',
      });
      expect(mockGetActionListByStatus).toBeCalledWith(
        expect.objectContaining({
          withOutputs: ['actionX'],
          elasticAgentIds: ['agentX'],
          commands: ['running-processes'],
          statuses: ['failed'],
          userIds: ['userX'],
        })
      );
    });

    it('should call `getActionList` when statuses filter values are not provided', async () => {
      await actionListHandler({
        ...defaultParams,
        commands: ['isolate', 'kill-process'],
        userIds: ['userX', 'userY'],
      });
      expect(mockGetActionList).toBeCalledWith(
        expect.objectContaining({
          commands: ['isolate', 'kill-process'],
          userIds: ['userX', 'userY'],
        })
      );
    });

    it('should correctly format the request when calling `getActionList`', async () => {
      await actionListHandler({
        ...defaultParams,
        agentIds: 'agentX',
        commands: 'isolate',
        userIds: 'userX',
      });

      expect(mockGetActionList).toHaveBeenCalledWith(
        expect.objectContaining({
          commands: ['isolate'],
          elasticAgentIds: ['agentX'],
          userIds: ['userX'],
        })
      );
    });
  });
});
