/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { FleetActionGenerator } from '../../../../common/endpoint/data_generators/fleet_action_generator';
import {
  getUniqueLogData,
  getActionCompletionInfo,
  isLogsEndpointAction,
  isLogsEndpointActionResponse,
  mapToNormalizedActionRequest,
} from './utils';
import type {
  ActivityLogAction,
  ActivityLogActionResponse,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
} from '../../../../common/endpoint/types';
import uuid from 'uuid';

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
        command: 'isolate',
        comment: expect.any(String),
        createdAt: '2022-04-27T16:08:47.449Z',
        createdBy: 'elastic',
        expiration: '2022-04-29T16:08:47.449Z',
        id: '90d62689-f72d-4a05-b5e3-500cad0dc366',
        type: 'ACTION_REQUEST',
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
        command: 'isolate',
        comment: expect.any(String),
        createdAt: '2022-04-27T16:08:47.449Z',
        createdBy: 'Shanel',
        expiration: '2022-05-10T16:08:47.449Z',
        id: '1d6e6796-b0af-496f-92b0-25fcb06db499',
        type: 'ACTION_REQUEST',
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
    });

    it('should show complete `false` if no action ids', () => {
      expect(getActionCompletionInfo([], [])).toEqual(NOT_COMPLETED_OUTPUT);
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
            EndpointActions: { completed_at: COMPLETED_AT },
          },
        },
      });
      expect(getActionCompletionInfo(['123'], [endpointResponse])).toEqual({
        isCompleted: true,
        completedAt: COMPLETED_AT,
        errors: undefined,
        wasSuccessful: true,
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
        });
      });

      it('should show `wasSuccessful` as `false` if fleet action response has error (no endpoint response)', () => {
        expect(getActionCompletionInfo(['123'], [fleetResponseAtError])).toEqual({
          completedAt: fleetResponseAtError.item.data.completed_at,
          errors: ['Fleet action response error: agent failed to deliver'],
          isCompleted: true,
          wasSuccessful: false,
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
        expect(getActionCompletionInfo(agentIds, [])).toEqual(NOT_COMPLETED_OUTPUT);
      });

      it('should complete as `false` if at least one agent id has not received a response', () => {
        expect(
          getActionCompletionInfo(agentIds, [
            ...action123Responses,

            // Action id: 456 === Not complete (only fleet response)
            action456Responses[0],

            ...action789Responses,
          ])
        ).toEqual(NOT_COMPLETED_OUTPUT);
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
});
