/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getScheduleNotificationResponseActionsService } from './schedule_notification_response_actions';
import type { RuleResponseAction } from '../../../../common/api/detection_engine';
import { ResponseActionTypesEnum } from '../../../../common/api/detection_engine';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

describe('ScheduleNotificationResponseActions', () => {
  const signalOne = {
    agent: { id: 'agent-id-1' },
    _id: 'alert-id-1',
    user: { id: 'S-1-5-20' },
    process: {
      pid: 123,
    },
    [ALERT_RULE_UUID]: 'rule-id-1',
    [ALERT_RULE_NAME]: 'rule-name-1',
  };
  const signalTwo = { agent: { id: 'agent-id-2' }, _id: 'alert-id-2' };
  const getSignals = () => [signalOne, signalTwo];

  const osqueryActionMock = {
    create: jest.fn(),
    stop: jest.fn(),
  };
  const endpointActionMock = {
    getActionCreateService: jest.fn().mockReturnValue({
      createActionFromAlert: jest.fn(),
    }),
  };
  const scheduleNotificationResponseActions = getScheduleNotificationResponseActionsService({
    osqueryCreateActionService: osqueryActionMock,
    endpointAppContextService: endpointActionMock as never,
    experimentalFeatures: {
      automatedProcessActionsEnabled: true,
      endpointResponseActionsEnabled: true,
    } as never,
  });

  describe('Osquery', () => {
    const simpleQuery = 'select * from uptime';
    const defaultQueryParams = {
      ecsMapping: { testField: { field: 'testField', value: 'testValue' } },
      savedQueryId: 'testSavedQueryId',
      query: undefined,
      queries: [],
      packId: undefined,
    };
    const defaultPackParams = {
      packId: 'testPackId',
      queries: [],
      query: undefined,
      ecsMapping: { testField: { field: 'testField', value: 'testValue' } },
      savedQueryId: undefined,
    };
    const defaultQueries = {
      ecs_mapping: undefined,
      platform: 'windows',
      version: '1.0.0',
      snapshot: true,
      removed: false,
    };

    const defaultResultParams = {
      agent_ids: ['agent-id-1', 'agent-id-2'],
      alert_ids: ['alert-id-1', 'alert-id-2'],
    };
    const defaultQueryResultParams = {
      ...defaultResultParams,
      ecs_mapping: { testField: { field: 'testField', value: 'testValue' } },
      ecsMapping: undefined,
      saved_query_id: 'testSavedQueryId',
      savedQueryId: undefined,
      queries: [],
    };
    const defaultPackResultParams = {
      ...defaultResultParams,
      query: undefined,
      saved_query_id: undefined,
      ecs_mapping: { testField: { field: 'testField', value: 'testValue' } },
    };
    it('should handle osquery response actions with query', async () => {
      const signals = getSignals();
      const responseActions: RuleResponseAction[] = [
        {
          actionTypeId: ResponseActionTypesEnum['.osquery'],
          params: {
            ...defaultQueryParams,
            query: simpleQuery,
          },
        },
      ];
      scheduleNotificationResponseActions({ signals, responseActions });

      expect(osqueryActionMock.create).toHaveBeenCalledWith({
        ...defaultQueryResultParams,
        query: simpleQuery,
      });
    });

    it('should handle osquery response actions with packs', async () => {
      const signals = getSignals();

      const responseActions: RuleResponseAction[] = [
        {
          actionTypeId: ResponseActionTypesEnum['.osquery'],
          params: {
            ...defaultPackParams,
            queries: [
              {
                ...defaultQueries,
                id: 'query-1',
                query: simpleQuery,
              },
            ],
            packId: 'testPackId',
          },
        },
      ];
      scheduleNotificationResponseActions({ signals, responseActions });

      expect(osqueryActionMock.create).toHaveBeenCalledWith({
        ...defaultPackResultParams,
        queries: [{ ...defaultQueries, id: 'query-1', query: simpleQuery }],
      });
    });
  });
  describe('Endpoint', () => {
    it('should handle endpoint isolate actions', async () => {
      const signals = getSignals();

      const responseActions: RuleResponseAction[] = [
        {
          actionTypeId: ResponseActionTypesEnum['.endpoint'],
          params: {
            command: 'isolate',
            comment: 'test isolate comment',
          },
        },
      ];
      scheduleNotificationResponseActions({ signals, responseActions });

      expect(
        endpointActionMock.getActionCreateService().createActionFromAlert
      ).toHaveBeenCalledTimes(signals.length);
      expect(
        endpointActionMock.getActionCreateService().createActionFromAlert
      ).toHaveBeenCalledWith(
        {
          alert_ids: ['alert-id-1'],
          command: 'isolate',
          comment: 'test isolate comment',
          endpoint_ids: ['agent-id-1'],
          agent_type: 'endpoint',
          hosts: {
            'agent-id-1': {
              id: 'agent-id-1',
              name: '',
            },
          },
          rule_id: 'rule-id-1',
          rule_name: 'rule-name-1',
        },
        ['agent-id-1']
      );
    });
    it('should handle endpoint kill-process actions', async () => {
      const signals = getSignals();
      const responseActions: RuleResponseAction[] = [
        {
          actionTypeId: ResponseActionTypesEnum['.endpoint'],
          params: {
            command: 'kill-process',
            comment: 'test process comment',
            config: {
              overwrite: true,
              field: '',
            },
          },
        },
      ];
      scheduleNotificationResponseActions({
        signals,
        responseActions,
      });

      expect(
        endpointActionMock.getActionCreateService().createActionFromAlert
      ).toHaveBeenCalledWith(
        {
          agent_type: 'endpoint',
          alert_ids: ['alert-id-1'],
          command: 'kill-process',
          comment: 'test process comment',
          endpoint_ids: ['agent-id-1'],
          error: undefined,
          hosts: {
            'agent-id-1': {
              id: 'agent-id-1',
              name: undefined,
            },
          },
          parameters: {
            pid: 123,
          },
          rule_id: 'rule-id-1',
          rule_name: 'rule-name-1',
        },
        ['agent-id-1']
      );
    });
  });
});
