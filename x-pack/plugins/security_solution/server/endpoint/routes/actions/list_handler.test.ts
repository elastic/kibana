/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { KibanaResponseFactory, RequestHandler, RouteConfig } from '@kbn/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { ENDPOINTS_ACTION_LIST_ROUTE } from '../../../../common/endpoint/constants';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
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

    registerActionListRoutes(routerMock, {
      logFactory: loggingSystemMock.create(),
      service: endpointAppContextService,
      config: () => Promise.resolve(createMockConfig()),
      experimentalFeatures: parseExperimentalConfigValue(createMockConfig().enableExperimental),
    });

    actionListHandler = async (
      query?: EndpointActionListRequestQuery
    ): Promise<jest.Mocked<KibanaResponseFactory>> => {
      const req = httpServerMock.createKibanaRequest({
        query,
      });
      mockResponse = httpServerMock.createResponseFactory();
      const [, routeHandler]: [
        RouteConfig<any, any, any, any>,
        RequestHandler<
          unknown,
          EndpointActionListRequestQuery,
          unknown,
          SecuritySolutionRequestHandlerContext
        >
      ] = routerMock.get.mock.calls.find(([{ path }]) =>
        path.startsWith(ENDPOINTS_ACTION_LIST_ROUTE)
      )!;
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
    it('should return `notFound` when actions index does not exist', async () => {
      mockDoesLogsEndpointActionsIndexExist.mockResolvedValue(false);
      await actionListHandler({ pageSize: 10, page: 1 });
      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: 'index_not_found_exception',
      });
    });

    it('should return `ok` when actions index exists', async () => {
      await actionListHandler({ pageSize: 10, page: 1 });
      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should call `getActionListByStatus` when statuses filter values are provided', async () => {
      await actionListHandler({ pageSize: 10, page: 1, statuses: ['failed', 'pending'] });
      expect(mockGetActionListByStatus).toBeCalledWith(
        expect.objectContaining({ statuses: ['failed', 'pending'] })
      );
    });

    it('should correctly format the request when calling `getActionListByStatus`', async () => {
      await actionListHandler({
        agentIds: 'agentX',
        commands: 'running-processes',
        statuses: 'failed',
        userIds: 'userX',
      });
      expect(mockGetActionListByStatus).toBeCalledWith(
        expect.objectContaining({
          elasticAgentIds: ['agentX'],
          commands: ['running-processes'],
          statuses: ['failed'],
          userIds: ['userX'],
        })
      );
    });

    it('should call `getActionList` when statuses filter values are not provided', async () => {
      await actionListHandler({
        pageSize: 10,
        page: 1,
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
        page: 1,
        pageSize: 10,
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
