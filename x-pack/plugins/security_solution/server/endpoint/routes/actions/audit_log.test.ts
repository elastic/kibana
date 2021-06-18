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
import { aMockAction, aMockResponse, MockAction, mockAuditLog, MockResponse } from './mocks';
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
      query?: EndpointActionLogRequestQuery
    ) => Promise<jest.Mocked<KibanaResponseFactory>>;
    // convenience for injecting mock responses for actions index and responses
    let havingActionsAndResponses: (actions: MockAction[], responses: any[]) => void;

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

      getActivityLog = async (query?: any): Promise<jest.Mocked<KibanaResponseFactory>> => {
        const req = httpServerMock.createKibanaRequest({
          params: { agent_id: mockID },
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
        const actionsData = actions.map((a) => ({
          _index: '.fleet-actions-7',
          _source: a.build(),
        }));
        const responsesData = responses.map((r) => ({
          _index: '.ds-.fleet-actions-results-2021.06.09-000001',
          _source: r.build(),
        }));
        const mockResult = mockAuditLog([...actionsData, ...responsesData]);
        esClientMock.asCurrentUser.search = jest
          .fn()
          .mockImplementationOnce(() => Promise.resolve(mockResult));
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
      const response = await getActivityLog();
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as ActivityLog).data).toHaveLength(0);
    });

    it('should have actions and action responses', async () => {
      havingActionsAndResponses(
        [
          aMockAction().withAgent(mockID).withAction('isolate'),
          aMockAction().withAgent(mockID).withAction('unisolate'),
          aMockAction().withAgent(mockID).withAction('isolate'),
        ],
        [aMockResponse(actionID, mockID), aMockResponse(actionID, mockID)]
      );
      const response = await getActivityLog();
      const responseBody = response.ok.mock.calls[0][0]?.body as ActivityLog;

      expect(response.ok).toBeCalled();
      expect(responseBody.data).toHaveLength(5);
      expect(responseBody.data.filter((x: any) => x.type === 'response')).toHaveLength(2);
      expect(responseBody.data.filter((x: any) => x.type === 'action')).toHaveLength(3);
    });

    it('should throw errors when no results for some agentID', async () => {
      havingErrors();

      try {
        await getActivityLog();
      } catch (error) {
        expect(error.message).toEqual(`Error fetching actions log for agent_id ${mockID}`);
      }
    });
  });
});
