/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { KibanaResponseFactory, RequestHandler, RouteConfig } from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from 'src/core/server/mocks';
import {
  EndpointActionLogRequestParams,
  EndpointActionLogRequestQuery,
  EndpointActionLogRequestSchema,
} from '../../../../common/endpoint/schema/actions';
import { ENDPOINT_ACTION_LOG_ROUTE } from '../../../../common/endpoint/constants';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { registerActionAuditLogRoutes } from './audit_log';
import uuid from 'uuid';
import { aMockAction, aMockResponse, MockAction, mockSearchResult, MockResponse } from './mocks';
import { SecuritySolutionRequestHandlerContext } from '../../../types';
import { ActivityLog } from '../../../../common/endpoint/types';

describe('Action Log API', () => {
  describe('schema', () => {
    it('should require at least 1 agent ID', () => {
      expect(() => {
        EndpointActionLogRequestSchema.params.validate({}); // no agent_ids provided
      }).toThrow();
    });

    it('should accept a single agent ID', () => {
      expect(() => {
        EndpointActionLogRequestSchema.params.validate({ agent_id: uuid.v4() });
      }).not.toThrow();
    });

    it('should work without query params', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({});
      }).not.toThrow();
    });

    it('should work with query params', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({ page: 10, page_size: 100 });
      }).not.toThrow();
    });

    it('should work with all query params', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
        });
      }).not.toThrow();
    });

    it('should work with just startDate', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({
          page: 1,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        });
      }).not.toThrow();
    });

    it('should work with just endDate', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({
          page: 1,
          page_size: 100,
          end_date: new Date().toISOString(), // today
        });
      }).not.toThrow();
    });

    it('should not work without allowed page and page_size params', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({ page_size: 101 });
      }).toThrow();
    });
  });

  describe('response', () => {
    const mockID = 'XYZABC-000';
    const actionID = 'some-known-actionid';
    let endpointAppContextService: EndpointAppContextService;

    // convenience for calling the route and handler for audit log
    let getActivityLog: (
      params: EndpointActionLogRequestParams,
      query?: EndpointActionLogRequestQuery
    ) => Promise<jest.Mocked<KibanaResponseFactory>>;
    // convenience for injecting mock responses for actions index and responses
    let havingActionsAndResponses: (actions: MockAction[], responses: MockResponse[]) => void;

    let havingErrors: () => void;

    beforeEach(() => {
      const esClientMock = elasticsearchServiceMock.createScopedClusterClient();
      const routerMock = httpServiceMock.createRouter();
      endpointAppContextService = new EndpointAppContextService();
      endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());

      registerActionAuditLogRoutes(routerMock, {
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
        experimentalFeatures: parseExperimentalConfigValue(createMockConfig().enableExperimental),
      });

      getActivityLog = async (
        params: { agent_id: string },
        query?: { page: number; page_size: number; start_date?: string; end_date?: string }
      ): Promise<jest.Mocked<KibanaResponseFactory>> => {
        const req = httpServerMock.createKibanaRequest({
          params,
          query,
        });
        const mockResponse = httpServerMock.createResponseFactory();
        const [, routeHandler]: [
          RouteConfig<any, any, any, any>,
          RequestHandler<
            EndpointActionLogRequestParams,
            EndpointActionLogRequestQuery,
            unknown,
            SecuritySolutionRequestHandlerContext
          >
        ] = routerMock.get.mock.calls.find(([{ path }]) =>
          path.startsWith(ENDPOINT_ACTION_LOG_ROUTE)
        )!;
        await routeHandler(
          createRouteHandlerContext(esClientMock, savedObjectsClientMock.create()),
          req,
          mockResponse
        );

        return mockResponse;
      };

      havingActionsAndResponses = (actions: MockAction[], responses: MockResponse[]) => {
        esClientMock.asCurrentUser.search = jest.fn().mockImplementation((req) => {
          const items: any[] =
            req.index === '.fleet-actions' ? actions.splice(0, 50) : responses.splice(0, 1000);

          return Promise.resolve(mockSearchResult(items.map((x) => x.build())));
        });
      };

      havingErrors = () => {
        esClientMock.asCurrentUser.search = jest.fn().mockImplementationOnce(() =>
          Promise.resolve(() => {
            throw new Error();
          })
        );
      };
    });

    afterEach(() => {
      endpointAppContextService.stop();
    });

    it('should return an empty array when nothing in audit log', async () => {
      havingActionsAndResponses([], []);
      const response = await getActivityLog({ agent_id: mockID });
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as ActivityLog).data).toHaveLength(0);
    });

    it('should have actions and action responses', async () => {
      havingActionsAndResponses(
        [
          aMockAction().withAgent(mockID).withAction('isolate').withID(actionID),
          aMockAction().withAgent(mockID).withAction('unisolate'),
        ],
        [aMockResponse(actionID, mockID).forAction(actionID).forAgent(mockID)]
      );
      const response = await getActivityLog({ agent_id: mockID });
      const responseBody = response.ok.mock.calls[0][0]?.body as ActivityLog;

      expect(response.ok).toBeCalled();
      expect(responseBody.data).toHaveLength(3);
      expect(responseBody.data.filter((e) => e.type === 'response')).toHaveLength(1);
      expect(responseBody.data.filter((e) => e.type === 'action')).toHaveLength(2);
    });

    it('should throw errors when no results for some agentID', async () => {
      havingErrors();

      try {
        await getActivityLog({ agent_id: mockID });
      } catch (error) {
        expect(error.message).toEqual(`Error fetching actions log for agent_id ${mockID}`);
      }
    });

    it('should return date ranges if present in the query', async () => {
      havingActionsAndResponses([], []);
      const startDate = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString();
      const endDate = new Date().toISOString();
      const response = await getActivityLog(
        { agent_id: mockID },
        {
          page: 1,
          page_size: 50,
          start_date: startDate,
          end_date: endDate,
        }
      );
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as ActivityLog).startDate).toEqual(startDate);
      expect((response.ok.mock.calls[0][0]?.body as ActivityLog).endDate).toEqual(endDate);
    });
  });
});
