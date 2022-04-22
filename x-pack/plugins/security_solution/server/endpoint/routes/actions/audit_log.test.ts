/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { KibanaResponseFactory, RequestHandler, RouteConfig } from '@kbn/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
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
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { registerActionAuditLogRoutes } from './audit_log';
import uuid from 'uuid';
import { mockAuditLogSearchResult, Results } from './mocks';
import { SecuritySolutionRequestHandlerContext } from '../../../types';
import {
  ActivityLog,
  EndpointAction,
  EndpointActionResponse,
} from '../../../../common/endpoint/types';
import { FleetActionGenerator } from '../../../../common/endpoint/data_generators/fleet_action_generator';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';

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

    it('should not work when no params while requesting with query params', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({});
      }).toThrow();
    });

    it('should work with all required query params', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({
          page: 10,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          end_date: new Date().toISOString(), // today
        });
      }).not.toThrow();
    });

    it('should not work without endDate', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({
          page: 1,
          page_size: 100,
          start_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        });
      }).toThrow();
    });

    it('should not work without startDate', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({
          page: 1,
          page_size: 100,
          end_date: new Date().toISOString(), // today
        });
      }).toThrow();
    });

    it('should not work without allowed page and page_size params', () => {
      expect(() => {
        EndpointActionLogRequestSchema.query.validate({ page_size: 101 });
      }).toThrow();
    });
  });

  describe('response', () => {
    const mockAgentID = 'XYZABC-000';
    let endpointAppContextService: EndpointAppContextService;
    const fleetActionGenerator = new FleetActionGenerator('seed');
    const endpointActionGenerator = new EndpointActionGenerator('seed');

    // convenience for calling the route and handler for audit log
    let getActivityLog: (
      params: EndpointActionLogRequestParams,
      query?: EndpointActionLogRequestQuery
    ) => Promise<jest.Mocked<KibanaResponseFactory>>;

    // convenience for injecting mock action requests and responses
    // for .logs-endpoint and .fleet indices
    let mockActions: ({
      numActions,
      hasFleetActions,
      hasFleetResponses,
      hasResponses,
    }: {
      numActions: number;
      hasFleetActions?: boolean;
      hasFleetResponses?: boolean;
      hasResponses?: boolean;
    }) => void;

    let havingErrors: () => void;

    beforeEach(() => {
      const esClientMock = elasticsearchServiceMock.createScopedClusterClient();
      const routerMock = httpServiceMock.createRouter();
      endpointAppContextService = new EndpointAppContextService();
      endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
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
          coreMock.createCustomRequestHandlerContext(
            createRouteHandlerContext(esClientMock, savedObjectsClientMock.create())
          ) as SecuritySolutionRequestHandlerContext,
          req,
          mockResponse
        );

        return mockResponse;
      };

      // some arbitrary ids for needed actions
      const getMockActionIds = (numAction: number): string[] => {
        return [...Array(numAction).keys()].map(() => Math.random().toString(36).split('.')[1]);
      };

      // create as many actions as needed
      const getEndpointActionsData = (actionIds: string[]) => {
        const data = actionIds.map((actionId) =>
          endpointActionGenerator.generate({
            agent: { id: mockAgentID },
            EndpointActions: {
              action_id: actionId,
            },
          })
        );
        return data;
      };
      // create as many responses as needed
      const getEndpointResponseData = (actionIds: string[]) => {
        const data = actionIds.map((actionId) =>
          endpointActionGenerator.generateResponse({
            agent: { id: mockAgentID },
            EndpointActions: {
              action_id: actionId,
            },
          })
        );
        return data;
      };
      // create as many fleet actions as needed
      const getFleetResponseData = (actionIds: string[]) => {
        const data = actionIds.map((actionId) =>
          fleetActionGenerator.generateResponse({
            agent_id: mockAgentID,
            action_id: actionId,
          })
        );
        return data;
      };
      // create as many fleet responses as needed
      const getFleetActionData = (actionIds: string[]) => {
        const data = actionIds.map((actionId) =>
          fleetActionGenerator.generate({
            agents: [mockAgentID],
            action_id: actionId,
            data: {
              comment: 'some comment',
            },
          })
        );
        return data;
      };

      // mock actions and responses results in a single response
      mockActions = ({
        numActions,
        hasFleetActions = false,
        hasFleetResponses = false,
        hasResponses = false,
      }: {
        numActions: number;
        hasFleetActions?: boolean;
        hasFleetResponses?: boolean;
        hasResponses?: boolean;
      }) => {
        // @ts-expect-error incomplete types
        esClientMock.asInternalUser.search.mockResponseImplementationOnce(() => {
          let actions: Results[] = [];
          let fleetActions: Results[] = [];
          let responses: Results[] = [];
          let fleetResponses: Results[] = [];

          const actionIds = getMockActionIds(numActions);

          actions = getEndpointActionsData(actionIds).map((e) => ({
            _index: '.ds-.logs-endpoint.actions-default-2021.19.10-000001',
            _source: e,
          }));

          if (hasFleetActions) {
            fleetActions = getFleetActionData(actionIds).map((e) => ({
              _index: '.fleet-actions-7',
              _source: e,
            }));
          }

          if (hasFleetResponses) {
            fleetResponses = getFleetResponseData(actionIds).map((e) => ({
              _index: '.ds-.fleet-actions-results-2021.19.10-000001',
              _source: e,
            }));
          }

          if (hasResponses) {
            responses = getEndpointResponseData(actionIds).map((e) => ({
              _index: '.ds-.logs-endpoint.action.responses-default-2021.19.10-000001',
              _source: e,
            }));
          }

          const results = mockAuditLogSearchResult([
            ...actions,
            ...fleetActions,
            ...responses,
            ...fleetResponses,
          ]);

          return results;
        });
      };

      havingErrors = () => {
        esClientMock.asInternalUser.search.mockImplementationOnce(() =>
          // @ts-expect-error wrong definition
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
      mockActions({ numActions: 0 });

      const response = await getActivityLog({ agent_id: mockAgentID });
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as ActivityLog).data).toHaveLength(0);
    });

    it('should return fleet actions, fleet responses and endpoint responses', async () => {
      mockActions({
        numActions: 2,
        hasFleetActions: true,
        hasFleetResponses: true,
        hasResponses: true,
      });

      const response = await getActivityLog({ agent_id: mockAgentID });
      const responseBody = response.ok.mock.calls[0][0]?.body as ActivityLog;
      expect(response.ok).toBeCalled();
      expect(responseBody.data).toHaveLength(6);

      expect(
        responseBody.data.filter((e) => (e.item.data as EndpointActionResponse).completed_at)
      ).toHaveLength(2);
      expect(
        responseBody.data.filter((e) => (e.item.data as EndpointAction).expiration)
      ).toHaveLength(2);
    });

    it('should return only fleet actions and no responses', async () => {
      mockActions({ numActions: 2, hasFleetActions: true });

      const response = await getActivityLog({ agent_id: mockAgentID });
      const responseBody = response.ok.mock.calls[0][0]?.body as ActivityLog;
      expect(response.ok).toBeCalled();
      expect(responseBody.data).toHaveLength(2);

      expect(
        responseBody.data.filter((e) => (e.item.data as EndpointAction).expiration)
      ).toHaveLength(2);
    });

    it('should only have fleet data', async () => {
      mockActions({ numActions: 2, hasFleetActions: true, hasFleetResponses: true });

      const response = await getActivityLog({ agent_id: mockAgentID });
      const responseBody = response.ok.mock.calls[0][0]?.body as ActivityLog;
      expect(response.ok).toBeCalled();
      expect(responseBody.data).toHaveLength(4);

      expect(
        responseBody.data.filter((e) => (e.item.data as EndpointAction).expiration)
      ).toHaveLength(2);
      expect(
        responseBody.data.filter((e) => (e.item.data as EndpointActionResponse).completed_at)
      ).toHaveLength(2);
    });

    it('should throw errors when no results for some agentID', async () => {
      havingErrors();

      try {
        await getActivityLog({ agent_id: mockAgentID });
      } catch (error) {
        expect(error.message).toEqual(`Error fetching actions log for agent_id ${mockAgentID}`);
      }
    });

    it('should return date ranges if present in the query', async () => {
      mockActions({ numActions: 0 });

      const startDate = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString();
      const endDate = new Date().toISOString();
      const response = await getActivityLog(
        { agent_id: mockAgentID },
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
