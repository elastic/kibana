/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { KibanaResponseFactory, RequestHandler, RouteConfig } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { ActionStatusRequestSchema } from '../../../../common/endpoint/schema/actions';
import {
  ACTION_STATUS_ROUTE,
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../common/endpoint/constants';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { registerActionStatusRoutes } from './status';
import { v4 as uuid } from 'uuid';
import { ACTION_RESPONSE_INDICES } from '../../services/actions/constants';
import type {
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';

describe('Endpoint Pending Action Summary API', () => {
  let endpointAppContextService: EndpointAppContextService;
  let endpointActionGenerator: EndpointActionGenerator;

  // convenience for calling the route and handler for action status
  let getPendingStatus: (reqParams?: any) => Promise<jest.Mocked<KibanaResponseFactory>>;

  // convenience for injecting mock responses for actions index and responses
  let havingActionsAndResponses: (
    endpointRequests: LogsEndpointAction[],
    endpointResponses: LogsEndpointActionResponse[]
  ) => void;

  const setupRouteHandler = (pendingActionResponsesWithAck: boolean = true): void => {
    const esClientMock = elasticsearchServiceMock.createScopedClusterClient();
    const routerMock = httpServiceMock.createRouter();

    endpointActionGenerator = new EndpointActionGenerator('seed');
    endpointAppContextService = new EndpointAppContextService();
    (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });

    endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());

    registerActionStatusRoutes(routerMock, {
      logFactory: loggingSystemMock.create(),
      service: endpointAppContextService,
      config: () => Promise.resolve(createMockConfig()),
      experimentalFeatures: {
        ...parseExperimentalConfigValue(createMockConfig().enableExperimental),
        pendingActionResponsesWithAck,
      },
    });

    getPendingStatus = async (reqParams?: any): Promise<jest.Mocked<KibanaResponseFactory>> => {
      const req = httpServerMock.createKibanaRequest(reqParams);
      const mockResponse = httpServerMock.createResponseFactory();
      const [, routeHandler]: [
        RouteConfig<any, any, any, any>,
        RequestHandler<any, any, any, any>
      ] = routerMock.get.mock.calls.find(([{ path }]) => path.startsWith(ACTION_STATUS_ROUTE))!;
      await routeHandler(
        createRouteHandlerContext(esClientMock, savedObjectsClientMock.create()),
        req,
        mockResponse
      );

      return mockResponse;
    };

    havingActionsAndResponses = (
      endpointRequests: LogsEndpointAction[],
      endpointResponses: LogsEndpointActionResponse[]
    ) => {
      esClientMock.asInternalUser.search.mockResponseImplementation((req = {}) => {
        // @ts-expect-error size not defined as top level property when using typesWithBodyKey
        const size = req.size ? req.size : 10;
        const items: any[] = [];
        let index = Array.isArray(req.index) ? req.index.join() : req.index;

        switch (index) {
          case ENDPOINT_ACTIONS_INDEX:
            items.push(...endpointRequests.splice(0, size));
            break;

          case ACTION_RESPONSE_INDICES.join():
            items.push(...endpointResponses.splice(0, size));
            index = ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN;
            break;

          default:
            const error = new Error(`missing mock data for index: ${req.index}`);
            window.console.error(error);
            throw error;
        }

        return {
          body: endpointActionGenerator.toEsSearchResponse(
            items.map((item) => endpointActionGenerator.toEsSearchHit(item, index))
          ),
        };
      });
    };
  };

  afterEach(() => {
    if (endpointAppContextService) {
      endpointAppContextService.stop();
    }
  });

  describe('schema', () => {
    it('should require at least 1 agent ID', () => {
      expect(() => {
        ActionStatusRequestSchema.query.validate({}); // no agent_ids provided
      }).toThrow();
    });

    it('should accept a single agent ID', () => {
      expect(() => {
        ActionStatusRequestSchema.query.validate({ agent_ids: uuid() });
      }).not.toThrow();
    });

    it('should accept multiple agent IDs', () => {
      expect(() => {
        ActionStatusRequestSchema.query.validate({ agent_ids: [uuid(), uuid()] });
      }).not.toThrow();
    });
    it('should limit the maximum number of agent IDs', () => {
      const tooManyCooks = new Array(200).fill(uuid()); // all the same ID string
      expect(() => {
        ActionStatusRequestSchema.query.validate({ agent_ids: tooManyCooks });
      }).toThrow();
    });
  });

  describe.each([
    ['when pendingActionResponsesWithAck is TRUE', true],
    ['when pendingActionResponsesWithAck is FALSE', false],
  ])('response %s', (_, pendingActionResponsesWithAck) => {
    const getExpected = (value: number): number => {
      return pendingActionResponsesWithAck ? value : 0;
    };

    beforeEach(() => {
      setupRouteHandler(pendingActionResponsesWithAck);
    });

    it('should include agent IDs in the output, even if they have no actions', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses([], []);
      const response = await getPendingStatus({
        query: {
          agent_ids: [mockID],
        },
      });
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(1);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].agent_id).toEqual(mockID);
    });

    it('should include total counts for large (more than a page) action counts', async () => {
      const mockID = 'XYZABC-000';
      const actions: LogsEndpointAction[] = Array.from({ length: 1400 }, () =>
        endpointActionGenerator.generate({
          agent: { id: [mockID] },
          EndpointActions: { data: { command: 'isolate' } },
        })
      );
      havingActionsAndResponses(actions, []);

      const response = await getPendingStatus({
        query: {
          agent_ids: [mockID],
        },
      });

      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(1);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].agent_id).toEqual(mockID);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.isolate).toEqual(
        getExpected(1400)
      );
    });

    it('should respond with a valid pending action', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses(
        [
          endpointActionGenerator.generate({
            agent: { id: [mockID] },
          }),
        ],
        []
      );
      const response = await getPendingStatus({
        query: {
          agent_ids: [mockID],
        },
      });
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(1);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].agent_id).toEqual(mockID);
    });
    it('should include a total count of a pending action', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses(
        [
          endpointActionGenerator.generate({
            agent: { id: [mockID] },
            EndpointActions: { data: { command: 'isolate' } },
          }),
          endpointActionGenerator.generate({
            agent: { id: [mockID] },
            EndpointActions: { data: { command: 'isolate' } },
          }),
        ],
        []
      );
      const response = await getPendingStatus({
        query: {
          agent_ids: [mockID],
        },
      });
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(1);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].agent_id).toEqual(mockID);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.isolate).toEqual(
        getExpected(2)
      );
    });
    it('should show multiple pending actions, and their counts', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses(
        Array.from<LogsEndpointAction['EndpointActions']['data']['command'], LogsEndpointAction>(
          ['isolate', 'isolate', 'isolate', 'unisolate', 'unisolate'],
          (command) =>
            endpointActionGenerator.generate({
              agent: { id: [mockID] },
              EndpointActions: { data: { command } },
            })
        ),
        []
      );
      const response = await getPendingStatus({
        query: {
          agent_ids: [mockID],
        },
      });
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(1);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].agent_id).toEqual(mockID);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.isolate).toEqual(
        getExpected(3)
      );
      expect(
        (response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.unisolate
      ).toEqual(getExpected(2));
    });
    it('should calculate correct pending counts from grouped/bulked actions', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses(
        [
          endpointActionGenerator.generate({
            agent: { id: [mockID, 'IRRELEVANT-OTHER-AGENT', 'ANOTHER-POSSIBLE-AGENT'] },
            EndpointActions: { data: { command: 'isolate' } },
          }),
          endpointActionGenerator.generate({
            agent: { id: [mockID, 'YET-ANOTHER-AGENT-ID'] },
            EndpointActions: { data: { command: 'isolate' } },
          }),
          endpointActionGenerator.generate({
            agent: { id: ['YET-ANOTHER-AGENT-ID'] },
            EndpointActions: { data: { command: 'isolate' } },
          }),
        ],
        []
      );
      const response = await getPendingStatus({
        query: {
          agent_ids: [mockID],
        },
      });
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(1);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].agent_id).toEqual(mockID);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.isolate).toEqual(
        getExpected(2)
      );
    });

    it('should exclude actions that have responses from the pending count', async () => {
      const mockAgentID = 'XYZABC-000';
      const actionID = 'some-known-actionid';
      havingActionsAndResponses(
        [
          endpointActionGenerator.generate({
            agent: { id: [mockAgentID] },
            EndpointActions: { data: { command: 'isolate' } },
          }),
          endpointActionGenerator.generate({
            agent: { id: [mockAgentID] },
            EndpointActions: { action_id: actionID, data: { command: 'isolate' } },
          }),
        ],
        [
          endpointActionGenerator.generateResponse({
            agent: { id: [mockAgentID] },
            EndpointActions: { action_id: actionID, data: { command: 'isolate' } },
          }),
        ]
      );
      (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
        .fn()
        .mockReturnValue({
          findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
        });
      const response = await getPendingStatus({
        query: {
          agent_ids: [mockAgentID],
        },
      });
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(1);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].agent_id).toEqual(mockAgentID);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.isolate).toEqual(
        getExpected(1)
      );
    });

    it('should have accurate counts for multiple agents, bulk actions, and responses', async () => {
      const agentOne = 'XYZABC-000';
      const agentTwo = 'DEADBEEF';
      const agentThree = 'IDIDIDID';

      const actionTwoID = 'ID-TWO';
      havingActionsAndResponses(
        [
          endpointActionGenerator.generate({
            agent: { id: [agentOne, agentTwo, agentThree] },
            EndpointActions: { data: { command: 'isolate' } },
          }),
          endpointActionGenerator.generate({
            agent: { id: [agentTwo, agentThree] },
            EndpointActions: { data: { command: 'isolate' }, action_id: actionTwoID },
          }),
          endpointActionGenerator.generate({
            agent: { id: [agentThree] },
            EndpointActions: { data: { command: 'isolate' } },
          }),
        ],

        [
          endpointActionGenerator.generateResponse({
            agent: { id: [agentThree] },
            EndpointActions: {
              action_id: actionTwoID,
            },
          }),
        ]
      );
      (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
        .fn()
        .mockReturnValue({
          findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
        });
      const response = await getPendingStatus({
        query: {
          agent_ids: [agentOne, agentTwo, agentThree],
        },
      });
      expect(response.ok).toBeCalled();
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(3);
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toContainEqual({
        agent_id: agentOne,
        pending_actions: {
          isolate: getExpected(1),
        },
      });
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toContainEqual({
        agent_id: agentTwo,
        pending_actions: {
          isolate: getExpected(2),
        },
      });
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toContainEqual({
        agent_id: agentThree,
        pending_actions: {
          isolate: getExpected(2), // present in all three actions, but second one has a response, therefore not pending
        },
      });
    });
  });
});
