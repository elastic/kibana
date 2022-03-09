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
import { ActionStatusRequestSchema } from '../../../../common/endpoint/schema/actions';
import { ACTION_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import { registerActionStatusRoutes } from './status';
import uuid from 'uuid';
import {
  aMockAction,
  aMockResponse,
  aMockEndpointResponse,
  MockEndpointResponse,
  MockAction,
  mockSearchResult,
  MockResponse,
} from './mocks';

describe('Endpoint Action Status', () => {
  describe('schema', () => {
    it('should require at least 1 agent ID', () => {
      expect(() => {
        ActionStatusRequestSchema.query.validate({}); // no agent_ids provided
      }).toThrow();
    });

    it('should accept a single agent ID', () => {
      expect(() => {
        ActionStatusRequestSchema.query.validate({ agent_ids: uuid.v4() });
      }).not.toThrow();
    });

    it('should accept multiple agent IDs', () => {
      expect(() => {
        ActionStatusRequestSchema.query.validate({ agent_ids: [uuid.v4(), uuid.v4()] });
      }).not.toThrow();
    });
    it('should limit the maximum number of agent IDs', () => {
      const tooManyCooks = new Array(200).fill(uuid.v4()); // all the same ID string
      expect(() => {
        ActionStatusRequestSchema.query.validate({ agent_ids: tooManyCooks });
      }).toThrow();
    });
  });

  describe('response', () => {
    let endpointAppContextService: EndpointAppContextService;

    // convenience for calling the route and handler for action status
    let getPendingStatus: (reqParams?: any) => Promise<jest.Mocked<KibanaResponseFactory>>;
    // convenience for injecting mock responses for actions index and responses
    let havingActionsAndResponses: (
      actions: MockAction[],
      responses: MockResponse[],
      endpointResponses?: MockEndpointResponse[]
    ) => void;

    beforeEach(() => {
      const esClientMock = elasticsearchServiceMock.createScopedClusterClient();
      const routerMock = httpServiceMock.createRouter();
      endpointAppContextService = new EndpointAppContextService();
      endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
      endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());

      registerActionStatusRoutes(routerMock, {
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
        experimentalFeatures: {
          ...parseExperimentalConfigValue(createMockConfig().enableExperimental),
          pendingActionResponsesWithAck: true,
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
        actions: MockAction[],
        responses: MockResponse[],
        endpointResponses?: MockEndpointResponse[]
      ) => {
        esClientMock.asInternalUser.search.mockResponseImplementation((req = {}) => {
          const size = req.size ? req.size : 10;
          const items: any[] =
            req.index === '.fleet-actions'
              ? actions.splice(0, size)
              : req.index === '.logs-endpoint.action.responses' && !!endpointResponses
              ? endpointResponses
              : responses.splice(0, size);

          if (items.length > 0) {
            return mockSearchResult(items.map((x) => x.build()));
          } else {
            return mockSearchResult();
          }
        });
      };
    });

    afterEach(() => {
      endpointAppContextService.stop();
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
      const actions = [];
      for (let i = 0; i < 1400; i++) {
        // putting more than a single page of results in
        actions.push(aMockAction().withAgent(mockID));
      }
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
        1400
      );
    });

    it('should respond with a valid pending action', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses([aMockAction().withAgent(mockID)], []);
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
          aMockAction().withAgent(mockID).withAction('isolate'),
          aMockAction().withAgent(mockID).withAction('isolate'),
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
        2
      );
    });
    it('should show multiple pending actions, and their counts', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses(
        [
          aMockAction().withAgent(mockID).withAction('isolate'),
          aMockAction().withAgent(mockID).withAction('isolate'),
          aMockAction().withAgent(mockID).withAction('isolate'),
          aMockAction().withAgent(mockID).withAction('unisolate'),
          aMockAction().withAgent(mockID).withAction('unisolate'),
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
        3
      );
      expect(
        (response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.unisolate
      ).toEqual(2);
    });
    it('should calculate correct pending counts from grouped/bulked actions', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses(
        [
          aMockAction()
            .withAgents([mockID, 'IRRELEVANT-OTHER-AGENT', 'ANOTHER-POSSIBLE-AGENT'])
            .withAction('isolate'),
          aMockAction().withAgents([mockID, 'YET-ANOTHER-AGENT-ID']).withAction('isolate'),
          aMockAction().withAgents(['YET-ANOTHER-AGENT-ID']).withAction('isolate'), // one WITHOUT our agent-under-test
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
        2
      );
    });

    it('should exclude actions that have responses from the pending count', async () => {
      const mockAgentID = 'XYZABC-000';
      const actionID = 'some-known-actionid';
      havingActionsAndResponses(
        [
          aMockAction().withAgent(mockAgentID).withAction('isolate'),
          aMockAction().withAgent(mockAgentID).withAction('isolate').withID(actionID),
        ],
        [aMockResponse(actionID, mockAgentID)]
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
        1
      );
    });

    it('should have accurate counts for multiple agents, bulk actions, and responses', async () => {
      const agentOne = 'XYZABC-000';
      const agentTwo = 'DEADBEEF';
      const agentThree = 'IDIDIDID';

      const actionTwoID = 'ID-TWO';
      havingActionsAndResponses(
        [
          aMockAction().withAgents([agentOne, agentTwo, agentThree]).withAction('isolate'),
          aMockAction()
            .withAgents([agentTwo, agentThree])
            .withAction('isolate')
            .withID(actionTwoID),
          aMockAction().withAgents([agentThree]).withAction('isolate'),
        ],
        [aMockResponse(actionTwoID, agentThree)]
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
          isolate: 1,
        },
      });
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toContainEqual({
        agent_id: agentTwo,
        pending_actions: {
          isolate: 2,
        },
      });
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toContainEqual({
        agent_id: agentThree,
        pending_actions: {
          isolate: 2, // present in all three actions, but second one has a response, therefore not pending
        },
      });
    });

    describe('with endpoint response index', () => {
      it('should respond with 1 pending action response when no endpoint response', async () => {
        const mockAgentID = 'XYZABC-000';
        const actionID = 'some-known-action_id';
        havingActionsAndResponses(
          [aMockAction().withAgent(mockAgentID).withID(actionID)],
          [aMockResponse(actionID, mockAgentID, true)]
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
      });

      it('should respond with 0 pending action response when there is a matching endpoint response', async () => {
        const mockAgentID = 'XYZABC-000';
        const actionID = 'some-known-action_id';
        havingActionsAndResponses(
          [aMockAction().withAgent(mockAgentID).withID(actionID)],
          [aMockResponse(actionID, mockAgentID, true)],
          [aMockEndpointResponse(actionID, mockAgentID)]
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
      });

      it('should include a total count of a pending action response', async () => {
        const mockAgentId = 'XYZABC-000';
        const actionIds = ['action_id_0', 'action_id_1'];
        havingActionsAndResponses(
          [
            aMockAction().withAgent(mockAgentId).withAction('isolate').withID(actionIds[0]),
            aMockAction().withAgent(mockAgentId).withAction('isolate').withID(actionIds[1]),
          ],
          [
            aMockResponse(actionIds[0], mockAgentId, true),
            aMockResponse(actionIds[1], mockAgentId, true),
          ]
        );
        (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
          .fn()
          .mockReturnValue({
            findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
          });
        const response = await getPendingStatus({
          query: {
            agent_ids: [mockAgentId],
          },
        });
        expect(response.ok).toBeCalled();
        expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(1);
        expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].agent_id).toEqual(mockAgentId);
        expect(
          (response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.isolate
        ).toEqual(2);
      });

      it('should show multiple pending action responses, and their counts', async () => {
        const mockAgentID = 'XYZABC-000';
        const actionIds = ['ack_0', 'ack_1', 'ack_2', 'ack_3', 'ack_4'];
        havingActionsAndResponses(
          [
            aMockAction().withAgent(mockAgentID).withAction('isolate').withID(actionIds[0]),
            aMockAction().withAgent(mockAgentID).withAction('isolate').withID(actionIds[1]),
            aMockAction().withAgent(mockAgentID).withAction('isolate').withID(actionIds[2]),
            aMockAction().withAgent(mockAgentID).withAction('unisolate').withID(actionIds[3]),
            aMockAction().withAgent(mockAgentID).withAction('unisolate').withID(actionIds[4]),
          ],
          [
            aMockResponse(actionIds[0], mockAgentID, true),
            aMockResponse(actionIds[1], mockAgentID, true),
            aMockResponse(actionIds[2], mockAgentID, true),
            aMockResponse(actionIds[3], mockAgentID, true),
            aMockResponse(actionIds[4], mockAgentID, true),
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
        expect(
          (response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.isolate
        ).toEqual(3);
        expect(
          (response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.unisolate
        ).toEqual(2);
      });
    });
  });

  describe('response (when pendingActionResponsesWithAck is FALSE)', () => {
    let endpointAppContextService: EndpointAppContextService;

    // convenience for calling the route and handler for action status
    let getPendingStatus: (reqParams?: any) => Promise<jest.Mocked<KibanaResponseFactory>>;
    // convenience for injecting mock responses for actions index and responses
    let havingActionsAndResponses: (
      actions: MockAction[],
      responses: MockResponse[],
      endpointResponses?: MockEndpointResponse[]
    ) => void;

    beforeEach(() => {
      const esClientMock = elasticsearchServiceMock.createScopedClusterClient();
      const routerMock = httpServiceMock.createRouter();
      endpointAppContextService = new EndpointAppContextService();
      endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
      endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());

      registerActionStatusRoutes(routerMock, {
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
        experimentalFeatures: {
          ...parseExperimentalConfigValue(createMockConfig().enableExperimental),
          pendingActionResponsesWithAck: false,
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
        actions: MockAction[],
        responses: MockResponse[],
        endpointResponses?: MockEndpointResponse[]
      ) => {
        esClientMock.asInternalUser.search.mockResponseImplementation((req = {}) => {
          const size = req.size ? req.size : 10;
          const items: any[] =
            req.index === '.fleet-actions'
              ? actions.splice(0, size)
              : req.index === '.logs-endpoint.action.responses' && !!endpointResponses
              ? endpointResponses
              : responses.splice(0, size);

          if (items.length > 0) {
            return mockSearchResult(items.map((x) => x.build()));
          } else {
            return mockSearchResult();
          }
        });
      };
    });

    afterEach(() => {
      endpointAppContextService.stop();
    });

    it('should include total counts for large (more than a page) action counts', async () => {
      const mockID = 'XYZABC-000';
      const actions = [];
      for (let i = 0; i < 1400; i++) {
        // putting more than a single page of results in
        actions.push(aMockAction().withAgent(mockID));
      }
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
        0
      );
    });
    it('should include a total count of a pending action', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses(
        [
          aMockAction().withAgent(mockID).withAction('isolate'),
          aMockAction().withAgent(mockID).withAction('isolate'),
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
        0
      );
    });
    it('should show multiple pending actions, and their counts', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses(
        [
          aMockAction().withAgent(mockID).withAction('isolate'),
          aMockAction().withAgent(mockID).withAction('isolate'),
          aMockAction().withAgent(mockID).withAction('isolate'),
          aMockAction().withAgent(mockID).withAction('unisolate'),
          aMockAction().withAgent(mockID).withAction('unisolate'),
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
        0
      );
      expect(
        (response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.unisolate
      ).toEqual(0);
    });
    it('should calculate correct pending counts from grouped/bulked actions', async () => {
      const mockID = 'XYZABC-000';
      havingActionsAndResponses(
        [
          aMockAction()
            .withAgents([mockID, 'IRRELEVANT-OTHER-AGENT', 'ANOTHER-POSSIBLE-AGENT'])
            .withAction('isolate'),
          aMockAction().withAgents([mockID, 'YET-ANOTHER-AGENT-ID']).withAction('isolate'),
          aMockAction().withAgents(['YET-ANOTHER-AGENT-ID']).withAction('isolate'), // one WITHOUT our agent-under-test
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
        0
      );
    });

    it('should exclude actions that have responses from the pending count', async () => {
      const mockAgentID = 'XYZABC-000';
      const actionID = 'some-known-actionid';
      havingActionsAndResponses(
        [
          aMockAction().withAgent(mockAgentID).withAction('isolate'),
          aMockAction().withAgent(mockAgentID).withAction('isolate').withID(actionID),
        ],
        [aMockResponse(actionID, mockAgentID)]
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
        0
      );
    });
    it('should have accurate counts for multiple agents, bulk actions, and responses', async () => {
      const agentOne = 'XYZABC-000';
      const agentTwo = 'DEADBEEF';
      const agentThree = 'IDIDIDID';

      const actionTwoID = 'ID-TWO';
      havingActionsAndResponses(
        [
          aMockAction().withAgents([agentOne, agentTwo, agentThree]).withAction('isolate'),
          aMockAction()
            .withAgents([agentTwo, agentThree])
            .withAction('isolate')
            .withID(actionTwoID),
          aMockAction().withAgents([agentThree]).withAction('isolate'),
        ],
        [aMockResponse(actionTwoID, agentThree)]
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
          isolate: 0,
        },
      });
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toContainEqual({
        agent_id: agentTwo,
        pending_actions: {
          isolate: 0,
        },
      });
      expect((response.ok.mock.calls[0][0]?.body as any)?.data).toContainEqual({
        agent_id: agentThree,
        pending_actions: {
          isolate: 0,
        },
      });
    });

    describe('with endpoint response index', () => {
      it('should include a total count of a pending action response', async () => {
        const mockAgentId = 'XYZABC-000';
        const actionIds = ['action_id_0', 'action_id_1'];
        havingActionsAndResponses(
          [
            aMockAction().withAgent(mockAgentId).withAction('isolate').withID(actionIds[0]),
            aMockAction().withAgent(mockAgentId).withAction('isolate').withID(actionIds[1]),
          ],
          [
            aMockResponse(actionIds[0], mockAgentId, true),
            aMockResponse(actionIds[1], mockAgentId, true),
          ]
        );
        (endpointAppContextService.getEndpointMetadataService as jest.Mock) = jest
          .fn()
          .mockReturnValue({
            findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
          });
        const response = await getPendingStatus({
          query: {
            agent_ids: [mockAgentId],
          },
        });
        expect(response.ok).toBeCalled();
        expect((response.ok.mock.calls[0][0]?.body as any)?.data).toHaveLength(1);
        expect((response.ok.mock.calls[0][0]?.body as any)?.data[0].agent_id).toEqual(mockAgentId);
        expect(
          (response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.isolate
        ).toEqual(0);
      });

      it('should show multiple pending action responses, and their counts', async () => {
        const mockAgentID = 'XYZABC-000';
        const actionIds = ['ack_0', 'ack_1', 'ack_2', 'ack_3', 'ack_4'];
        havingActionsAndResponses(
          [
            aMockAction().withAgent(mockAgentID).withAction('isolate').withID(actionIds[0]),
            aMockAction().withAgent(mockAgentID).withAction('isolate').withID(actionIds[1]),
            aMockAction().withAgent(mockAgentID).withAction('isolate').withID(actionIds[2]),
            aMockAction().withAgent(mockAgentID).withAction('unisolate').withID(actionIds[3]),
            aMockAction().withAgent(mockAgentID).withAction('unisolate').withID(actionIds[4]),
          ],
          [
            aMockResponse(actionIds[0], mockAgentID, true),
            aMockResponse(actionIds[1], mockAgentID, true),
            aMockResponse(actionIds[2], mockAgentID, true),
            aMockResponse(actionIds[3], mockAgentID, true),
            aMockResponse(actionIds[4], mockAgentID, true),
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
        expect(
          (response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.isolate
        ).toEqual(0);
        expect(
          (response.ok.mock.calls[0][0]?.body as any)?.data[0].pending_actions.unisolate
        ).toEqual(0);
      });
    });
  });
});
