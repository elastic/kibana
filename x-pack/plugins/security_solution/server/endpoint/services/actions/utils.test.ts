/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { FleetActionGenerator } from '../../../../common/endpoint/data_generators/fleet_action_generator';
import {
  categorizeActionResults,
  categorizeResponseResults,
  formatEndpointActionResults,
  getUniqueLogData,
  getActionCompletionInfo,
  getActionStatus,
  isLogsEndpointAction,
  isLogsEndpointActionResponse,
  mapToNormalizedActionRequest,
} from './utils';
import type {
  ActivityLogAction,
  ActivityLogActionResponse,
  EndpointAction,
  EndpointActionResponse,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { v4 as uuid } from 'uuid';
import type { Results } from '../../routes/actions/mocks';
import { mockAuditLogSearchResult } from '../../routes/actions/mocks';

describe('When using Actions service utilities', () => {
  let fleetActionGenerator: FleetActionGenerator;
  let endpointActionGenerator: EndpointActionGenerator;

  beforeEach(() => {
    fleetActionGenerator = new FleetActionGenerator('seed');
    endpointActionGenerator = new EndpointActionGenerator('seed');
  });

  describe('#isLogsEndpointAction()', () => {
    it('should return `true` for a `LogsEndpointAction` (endpoint action request)', () => {
      expect(isLogsEndpointAction(endpointActionGenerator.generate())).toBe(true);
    });

    it('should return `false` for an `EndpointAction` (fleet action request)', () => {
      expect(isLogsEndpointAction(fleetActionGenerator.generate())).toBe(false);
    });
  });

  describe('#isLogsEndpointActionResponse()', () => {
    it('should return `true` for a `LogsEndpointActionResponse` (response sent by endpoint)', () => {
      expect(isLogsEndpointActionResponse(endpointActionGenerator.generateResponse())).toBe(true);
    });

    it('should return `false` for a `EndpointActionResponse` (response sent by fleet agent)', () => {
      expect(isLogsEndpointActionResponse(fleetActionGenerator.generateResponse())).toBe(false);
    });
  });

  describe('#mapToNormalizedActionRequest()', () => {
    it('normalizes an `EndpointAction` (those stored in Fleet index)', () => {
      expect(
        mapToNormalizedActionRequest(
          fleetActionGenerator.generate({
            '@timestamp': '2022-04-27T16:08:47.449Z',
          })
        )
      ).toEqual({
        agents: ['6e6796b0-af39-4f12-b025-fcb06db499e5'],
        command: 'unisolate',
        comment: expect.any(String),
        createdAt: '2022-04-27T16:08:47.449Z',
        createdBy: 'elastic',
        expiration: '2022-04-29T16:08:47.449Z',
        id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
        type: 'ACTION_REQUEST',
        parameters: undefined,
      });
    });

    it('normalizes a `LogsEndpointAction` (those stored in Endpoint index)', () => {
      expect(
        mapToNormalizedActionRequest(
          endpointActionGenerator.generate({
            '@timestamp': '2022-04-27T16:08:47.449Z',
          })
        )
      ).toEqual({
        agents: ['90d62689-f72d-4a05-b5e3-500cad0dc366'],
        command: 'unisolate',
        comment: expect.any(String),
        createdAt: '2022-04-27T16:08:47.449Z',
        createdBy: 'Shanel',
        expiration: '2022-05-10T16:08:47.449Z',
        id: '1d6e6796-b0af-496f-92b0-25fcb06db499',
        type: 'ACTION_REQUEST',
        parameters: undefined,
      });
    });
  });

  describe('#getActionCompletionInfo()', () => {
    const COMPLETED_AT = '2022-05-05T18:53:18.836Z';
    const NOT_COMPLETED_OUTPUT = Object.freeze({
      isCompleted: false,
      completedAt: undefined,
      wasSuccessful: false,
      errors: undefined,
      outputs: {},
      agentState: {
        123: {
          completedAt: undefined,
          errors: undefined,
          isCompleted: false,
          wasSuccessful: false,
        },
      },
    });

    it('should show complete `false` if no action ids', () => {
      expect(getActionCompletionInfo([], [])).toEqual({ ...NOT_COMPLETED_OUTPUT, agentState: {} });
    });

    it('should show complete as `false` if no responses', () => {
      expect(getActionCompletionInfo(['123'], [])).toEqual(NOT_COMPLETED_OUTPUT);
    });

    it('should show complete as `false` if no Endpoint response', () => {
      expect(
        getActionCompletionInfo(
          ['123'],
          [
            fleetActionGenerator.generateActivityLogActionResponse({
              item: { data: { action_id: '123' } },
            }),
          ]
        )
      ).toEqual(NOT_COMPLETED_OUTPUT);
    });

    it('should show complete as `true` with completion date if Endpoint Response received', () => {
      const endpointResponse = endpointActionGenerator.generateActivityLogActionResponse({
        item: {
          data: {
            '@timestamp': COMPLETED_AT,
            agent: { id: '123' },
            EndpointActions: {
              completed_at: COMPLETED_AT,
              data: { output: { type: 'json', content: { foo: 'bar' } } },
            },
          },
        },
      });
      expect(getActionCompletionInfo(['123'], [endpointResponse])).toEqual({
        isCompleted: true,
        completedAt: COMPLETED_AT,
        errors: undefined,
        wasSuccessful: true,
        outputs: {
          '123': {
            content: {
              foo: 'bar',
            },
            type: 'json',
          },
        },
        agentState: {
          '123': {
            completedAt: COMPLETED_AT,
            errors: undefined,
            isCompleted: true,
            wasSuccessful: true,
          },
        },
      });
    });

    it('should return action outputs (if any) per agent id', () => {
      const processes = endpointActionGenerator.randomResponseActionProcesses(3);
      const endpointResponse = endpointActionGenerator.generateActivityLogActionResponse({
        item: {
          data: {
            '@timestamp': COMPLETED_AT,
            agent: { id: '123' },
            EndpointActions: {
              completed_at: COMPLETED_AT,
              data: {
                output: {
                  type: 'json',
                  content: {
                    entries: processes,
                  },
                },
              },
            },
          },
        },
      });
      expect(getActionCompletionInfo(['123'], [endpointResponse])).toEqual({
        isCompleted: true,
        completedAt: COMPLETED_AT,
        errors: undefined,
        wasSuccessful: true,
        outputs: {
          '123': {
            type: 'json',
            content: {
              entries: processes,
            },
          },
        },
        agentState: {
          '123': {
            completedAt: COMPLETED_AT,
            errors: undefined,
            isCompleted: true,
            wasSuccessful: true,
          },
        },
      });
    });

    describe('and action failed', () => {
      let fleetResponseAtError: ActivityLogActionResponse;
      let endpointResponseAtError: EndpointActivityLogActionResponse;

      beforeEach(() => {
        const actionId = uuid.v4();
        fleetResponseAtError = fleetActionGenerator.generateActivityLogActionResponse({
          item: {
            data: { agent_id: '123', action_id: actionId, error: 'agent failed to deliver' },
          },
        });

        endpointResponseAtError = endpointActionGenerator.generateActivityLogActionResponse({
          item: {
            data: {
              '@timestamp': '2022-05-18T13:03:54.756Z',
              agent: { id: '123' },
              error: {
                message: 'endpoint failed to apply',
              },
              EndpointActions: {
                action_id: actionId,
                completed_at: '2022-05-18T13:03:54.756Z',
              },
            },
          },
        });
      });

      it('should show `wasSuccessful` as `false` if endpoint action response has error', () => {
        expect(getActionCompletionInfo(['123'], [endpointResponseAtError])).toEqual({
          completedAt: endpointResponseAtError.item.data['@timestamp'],
          errors: ['Endpoint action response error: endpoint failed to apply'],
          isCompleted: true,
          wasSuccessful: false,
          outputs: {},
          agentState: {
            '123': {
              completedAt: endpointResponseAtError.item.data['@timestamp'],
              errors: ['Endpoint action response error: endpoint failed to apply'],
              isCompleted: true,
              wasSuccessful: false,
            },
          },
        });
      });

      it('should show `wasSuccessful` as `false` if fleet action response has error (no endpoint response)', () => {
        expect(getActionCompletionInfo(['123'], [fleetResponseAtError])).toEqual({
          completedAt: fleetResponseAtError.item.data.completed_at,
          errors: ['Fleet action response error: agent failed to deliver'],
          isCompleted: true,
          wasSuccessful: false,
          outputs: {},
          agentState: {
            '123': {
              completedAt: fleetResponseAtError.item.data.completed_at,
              errors: ['Fleet action response error: agent failed to deliver'],
              isCompleted: true,
              wasSuccessful: false,
            },
          },
        });
      });

      it('should include both fleet and endpoint errors if both responses returned failure', () => {
        expect(
          getActionCompletionInfo(['123'], [fleetResponseAtError, endpointResponseAtError])
        ).toEqual({
          completedAt: endpointResponseAtError.item.data['@timestamp'],
          errors: [
            'Endpoint action response error: endpoint failed to apply',
            'Fleet action response error: agent failed to deliver',
          ],
          isCompleted: true,
          wasSuccessful: false,
          outputs: {},
          agentState: {
            '123': {
              completedAt: endpointResponseAtError.item.data['@timestamp'],
              errors: [
                'Endpoint action response error: endpoint failed to apply',
                'Fleet action response error: agent failed to deliver',
              ],
              isCompleted: true,
              wasSuccessful: false,
            },
          },
        });
      });
    });

    describe('with multiple agent ids', () => {
      let agentIds: string[];
      let actionId: string;
      let action123Responses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>;
      let action456Responses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>;
      let action789Responses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>;

      beforeEach(() => {
        agentIds = ['123', '456', '789'];
        actionId = uuid.v4();
        action123Responses = [
          fleetActionGenerator.generateActivityLogActionResponse({
            item: { data: { agent_id: '123', error: '', action_id: actionId } },
          }),
          endpointActionGenerator.generateActivityLogActionResponse({
            item: {
              data: {
                '@timestamp': '2022-01-05T19:27:23.816Z',
                agent: { id: '123' },
                EndpointActions: { action_id: actionId, completed_at: '2022-01-05T19:27:23.816Z' },
              },
            },
          }),
        ];

        action456Responses = [
          fleetActionGenerator.generateActivityLogActionResponse({
            item: { data: { action_id: actionId, agent_id: '456', error: '' } },
          }),
          endpointActionGenerator.generateActivityLogActionResponse({
            item: {
              data: {
                '@timestamp': COMPLETED_AT,
                agent: { id: '456' },
                EndpointActions: { action_id: actionId, completed_at: COMPLETED_AT },
              },
            },
          }),
        ];

        action789Responses = [
          fleetActionGenerator.generateActivityLogActionResponse({
            item: { data: { action_id: actionId, agent_id: '789', error: '' } },
          }),
          endpointActionGenerator.generateActivityLogActionResponse({
            item: {
              data: {
                '@timestamp': '2022-03-05T19:27:23.816Z',
                agent: { id: '789' },
                EndpointActions: { action_id: actionId, completed_at: '2022-03-05T19:27:23.816Z' },
              },
            },
          }),
        ];
      });

      it('should show complete as `false` if no responses', () => {
        expect(getActionCompletionInfo(agentIds, [])).toEqual({
          ...NOT_COMPLETED_OUTPUT,
          agentState: {
            ...NOT_COMPLETED_OUTPUT.agentState,
            '456': {
              completedAt: undefined,
              errors: undefined,
              isCompleted: false,
              wasSuccessful: false,
            },
            '789': {
              completedAt: undefined,
              errors: undefined,
              isCompleted: false,
              wasSuccessful: false,
            },
          },
        });
      });

      it('should complete as `false` if at least one agent id has not received a response', () => {
        expect(
          getActionCompletionInfo(agentIds, [
            ...action123Responses,

            // Action id: 456 === Not complete (only fleet response)
            action456Responses[0],

            ...action789Responses,
          ])
        ).toEqual({
          ...NOT_COMPLETED_OUTPUT,
          agentState: {
            '123': {
              completedAt: '2022-01-05T19:27:23.816Z',
              errors: undefined,
              isCompleted: true,
              wasSuccessful: true,
            },
            '456': {
              completedAt: undefined,
              errors: undefined,
              isCompleted: false,
              wasSuccessful: false,
            },
            '789': {
              completedAt: '2022-03-05T19:27:23.816Z',
              errors: undefined,
              isCompleted: true,
              wasSuccessful: true,
            },
          },
        });
      });

      it('should show complete as `true` if all agent response were received', () => {
        expect(
          getActionCompletionInfo(agentIds, [
            ...action123Responses,
            ...action456Responses,
            ...action789Responses,
          ])
        ).toEqual({
          isCompleted: true,
          completedAt: COMPLETED_AT,
          wasSuccessful: true,
          errors: undefined,
          outputs: {
            '456': {
              content: {
                code: 'ra_get-file_success_done',
                contents: [
                  {
                    file_name: 'bad_file.txt',
                    path: '/some/path/bad_file.txt',
                    sha256: '9558c5cb39622e9b3653203e772b129d6c634e7dbd7af1b244352fc1d704601f',
                    size: 1234,
                    type: 'file',
                  },
                ],
                zip_size: 123,
              },
              type: 'json',
            },
          },
          agentState: {
            '123': {
              completedAt: '2022-01-05T19:27:23.816Z',
              errors: undefined,
              isCompleted: true,
              wasSuccessful: true,
            },
            '456': {
              completedAt: '2022-05-05T18:53:18.836Z',
              errors: undefined,
              isCompleted: true,
              wasSuccessful: true,
            },
            '789': {
              completedAt: '2022-03-05T19:27:23.816Z',
              errors: undefined,
              isCompleted: true,
              wasSuccessful: true,
            },
          },
        });
      });

      it('should complete as `true` if one agent only received a fleet response with error on it', () => {
        action456Responses[0].item.data.error = 'something is no good';
        action456Responses[0].item.data['@timestamp'] = '2022-05-06T12:50:19.747Z';

        expect(
          getActionCompletionInfo(agentIds, [
            ...action123Responses,

            // Action id: 456 === is complete with only a fleet response that has `error`
            action456Responses[0],

            ...action789Responses,
          ])
        ).toEqual({
          completedAt: '2022-05-06T12:50:19.747Z',
          errors: ['Fleet action response error: something is no good'],
          isCompleted: true,
          wasSuccessful: false,
          outputs: {},
          agentState: {
            '123': {
              completedAt: '2022-01-05T19:27:23.816Z',
              errors: undefined,
              isCompleted: true,
              wasSuccessful: true,
            },
            '456': {
              completedAt: action456Responses[0].item.data['@timestamp'],
              errors: ['Fleet action response error: something is no good'],
              isCompleted: true,
              wasSuccessful: false,
            },
            '789': {
              completedAt: '2022-03-05T19:27:23.816Z',
              errors: undefined,
              isCompleted: true,
              wasSuccessful: true,
            },
          },
        });
      });

      it('should include output for agents for which the action was complete', () => {
        // Add output to the completed actions
        (
          action123Responses[1] as EndpointActivityLogActionResponse
        ).item.data.EndpointActions.data.output = {
          type: 'json',
          content: {
            foo: 'bar',
          },
        };

        (
          action789Responses[1] as EndpointActivityLogActionResponse
        ).item.data.EndpointActions.data.output = {
          type: 'text',
          // @ts-expect-error need to fix ActionResponseOutput type
          content: 'some endpoint output data',
        };

        expect(
          getActionCompletionInfo(agentIds, [
            ...action123Responses,

            // Action id: 456 === Not complete (only fleet response)
            action456Responses[0],

            ...action789Responses,
          ])
        ).toEqual({
          ...NOT_COMPLETED_OUTPUT,
          agentState: {
            '123': {
              completedAt: '2022-01-05T19:27:23.816Z',
              errors: undefined,
              isCompleted: true,
              wasSuccessful: true,
            },
            '456': {
              completedAt: undefined,
              errors: undefined,
              isCompleted: false,
              wasSuccessful: false,
            },
            '789': {
              completedAt: '2022-03-05T19:27:23.816Z',
              errors: undefined,
              isCompleted: true,
              wasSuccessful: true,
            },
          },
          outputs: {
            '123': {
              content: {
                foo: 'bar',
              },
              type: 'json',
            },
            '789': {
              content: 'some endpoint output data',
              type: 'text',
            },
          },
        });
      });
    });
  });

  describe('#getUniqueLogData()', () => {
    let actionRequests123: Array<ActivityLogAction | EndpointActivityLogAction>;
    let actionResponses123: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>;

    let errorActionRequests: Array<ActivityLogAction | EndpointActivityLogAction>;
    let errorResponses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>;

    beforeEach(() => {
      const actionId0 = uuid.v4();
      const actionId1 = uuid.v4();
      actionRequests123 = [
        fleetActionGenerator.generateActivityLogAction({
          item: {
            data: { agents: ['123'], action_id: actionId0 },
          },
        }),
        endpointActionGenerator.generateActivityLogAction({
          item: {
            data: { agent: { id: '123' }, EndpointActions: { action_id: actionId0 } },
          },
        }),
        fleetActionGenerator.generateActivityLogAction({
          item: {
            data: { agents: ['123'], action_id: actionId1 },
          },
        }),
        endpointActionGenerator.generateActivityLogAction({
          item: {
            data: { agent: { id: '123' }, EndpointActions: { action_id: actionId1 } },
          },
        }),
      ];

      actionResponses123 = [
        fleetActionGenerator.generateActivityLogActionResponse({
          item: {
            data: { agent_id: '123', action_id: actionId0 },
          },
        }),
        endpointActionGenerator.generateActivityLogActionResponse({
          item: {
            data: {
              agent: { id: '123' },
              EndpointActions: {
                action_id: actionId0,
                completed_at: new Date().toISOString(),
              },
            },
          },
        }),
      ];

      errorActionRequests = [
        endpointActionGenerator.generateActivityLogAction({
          item: {
            data: {
              agent: { id: '456' },
              EndpointActions: { action_id: actionId0 },
              error: { message: 'Did not deliver to Fleet' },
            },
          },
        }),

        fleetActionGenerator.generateActivityLogAction({
          item: {
            data: { agents: ['456'], action_id: actionId1 },
          },
        }),
        endpointActionGenerator.generateActivityLogAction({
          item: {
            data: {
              agent: { id: '456' },
              EndpointActions: { action_id: actionId1 },
            },
          },
        }),
      ];

      errorResponses = [
        endpointActionGenerator.generateActivityLogActionResponse({
          item: {
            data: {
              agent: { id: '456' },
              EndpointActions: {
                action_id: actionId0,
                completed_at: new Date().toISOString(),
              },
              error: { code: '424', message: 'Did not deliver to Fleet' },
            },
          },
        }),

        fleetActionGenerator.generateActivityLogActionResponse({
          item: {
            data: { agent_id: '456', action_id: actionId1, error: 'some other error!' },
          },
        }),
        endpointActionGenerator.generateActivityLogActionResponse({
          item: {
            data: {
              agent: { id: '456' },
              EndpointActions: {
                action_id: actionId1,
                completed_at: new Date().toISOString(),
              },
              error: { message: 'some other error!' },
            },
          },
        }),
      ];
    });

    it('should exclude endpoint actions on successful actions', () => {
      const uniqueData = getUniqueLogData([...actionRequests123, ...actionResponses123]);
      expect(uniqueData.length).toEqual(4);
      expect(uniqueData.find((u) => u.type === 'action')).toEqual(undefined);
    });

    it('should include endpoint action when no fleet response but endpoint response with error', () => {
      const uniqueData = getUniqueLogData([...errorActionRequests, ...errorResponses]);
      expect(uniqueData.length).toEqual(5);
    });
  });

  describe('#categorizeActionResults(), #categorizeResponseResults() and #formatEndpointActionResults()', () => {
    let fleetActions: Results[];
    let endpointActions: Results[];
    let fleetResponses: Results[];
    let endpointResponses: Results[];

    beforeEach(() => {
      const agents = ['agent-id'];
      const actionIds = [uuid.v4(), uuid.v4()];

      fleetActions = actionIds.map((id) => {
        return {
          _index: '.fleet-actions-7',
          _source: fleetActionGenerator.generate({
            agents,
            action_id: id,
          }),
        };
      });

      endpointActions = actionIds.map((id) => {
        return {
          _index: '.ds-.logs-endpoint.actions-default-2021.19.10-000001',
          _source: endpointActionGenerator.generate({
            agent: { id: agents[0] },
            EndpointActions: {
              action_id: id,
            },
          }),
        };
      });

      fleetResponses = actionIds.map((id) => {
        return {
          _index: '.ds-.fleet-actions-results-2021.19.10-000001',
          _source: fleetActionGenerator.generate({
            agents,
            action_id: id,
          }),
        };
      });

      endpointResponses = actionIds.map((id) => {
        return {
          _index: '.ds-.logs-endpoint.action.responses-default-2021.19.10-000001',
          _source: endpointActionGenerator.generate({
            agent: { id: agents[0] },
            EndpointActions: {
              action_id: id,
            },
          }),
        };
      });
    });

    it('should correctly categorize fleet actions and endpoint actions', () => {
      const actionResults = mockAuditLogSearchResult([...fleetActions, ...endpointActions]);
      const categorized = categorizeActionResults({
        results: actionResults.body.hits.hits as Array<
          estypes.SearchHit<EndpointAction | LogsEndpointAction>
        >,
      });
      const categorizedActions = categorized.filter((e) => e.type === 'action');
      const categorizedFleetActions = categorized.filter((e) => e.type === 'fleetAction');
      expect(categorizedActions.length).toEqual(2);
      expect(categorizedFleetActions.length).toEqual(2);
      expect(
        (categorizedActions as EndpointActivityLogAction[]).map(
          (e) => 'EndpointActions' in e.item.data
        )[0]
      ).toBeTruthy();
      expect(
        (categorizedFleetActions as ActivityLogAction[]).map((e) => 'data' in e.item.data)[0]
      ).toBeTruthy();
    });
    it('should correctly categorize fleet responses and endpoint responses', () => {
      const actionResponses = mockAuditLogSearchResult([...fleetResponses, ...endpointResponses]);
      const categorized = categorizeResponseResults({
        results: actionResponses.body.hits.hits as Array<
          estypes.SearchHit<EndpointActionResponse | LogsEndpointActionResponse>
        >,
      });
      const categorizedResponses = categorized.filter((e) => e.type === 'response');
      const categorizedFleetResponses = categorized.filter((e) => e.type === 'fleetResponse');
      expect(categorizedResponses.length).toEqual(2);
      expect(categorizedFleetResponses.length).toEqual(2);
      expect(
        (categorizedResponses as EndpointActivityLogActionResponse[]).map(
          (e) => 'EndpointActions' in e.item.data
        )[0]
      ).toBeTruthy();
      expect(
        (categorizedFleetResponses as ActivityLogActionResponse[]).map(
          (e) => 'data' in e.item.data
        )[0]
      ).toBeTruthy();
    });

    it('should correctly format endpoint actions', () => {
      const actionResults = mockAuditLogSearchResult(endpointActions);
      const formattedActions = formatEndpointActionResults(
        actionResults.body.hits.hits as Array<estypes.SearchHit<LogsEndpointAction>>
      );
      const formattedActionRequests = formattedActions.filter((e) => e.type === 'action');

      expect(formattedActionRequests.length).toEqual(2);
      expect(
        (formattedActionRequests as EndpointActivityLogAction[]).map(
          (e) => 'EndpointActions' in e.item.data
        )[0]
      ).toBeTruthy();
    });
  });

  describe('#getActionStatus', () => {
    it('should show isExpired as TRUE and status as `failed` correctly', () => {
      expect(
        getActionStatus({
          expirationDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
          isCompleted: false,
          wasSuccessful: false,
        })
      ).toEqual({ isExpired: true, status: 'failed' });
    });

    it('should show isExpired as FALSE and status as `pending` correctly', () => {
      expect(
        getActionStatus({
          expirationDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
          isCompleted: false,
          wasSuccessful: false,
        })
      ).toEqual({ isExpired: false, status: 'pending' });
    });

    it('should show isExpired as FALSE and status as `successful` correctly', () => {
      expect(
        getActionStatus({
          expirationDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
          isCompleted: true,
          wasSuccessful: true,
        })
      ).toEqual({ isExpired: false, status: 'successful' });
    });

    it('should show isExpired as FALSE and status as `failed` correctly', () => {
      expect(
        getActionStatus({
          expirationDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
          isCompleted: true,
          wasSuccessful: false,
        })
      ).toEqual({ isExpired: false, status: 'failed' });
    });
  });
});
