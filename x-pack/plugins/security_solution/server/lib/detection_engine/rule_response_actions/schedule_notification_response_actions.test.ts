/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getScheduleNotificationResponseActionsService } from './schedule_notification_response_actions';
import type { RuleResponseAction } from '../../../../common/api/detection_engine/model/rule_response_actions';
import { RESPONSE_ACTION_TYPES } from '../../../../common/api/detection_engine/model/rule_response_actions';

describe('ScheduleNotificationResponseActions', () => {
  const signalOne = { agent: { id: 'agent-id-1' }, _id: 'alert-id-1', user: { id: 'S-1-5-20' } };
  const signalTwo = { agent: { id: 'agent-id-2' }, _id: 'alert-id-2' };
  const signals = [signalOne, signalTwo];
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
  const osqueryActionMock = {
    create: jest.fn(),
    stop: jest.fn(),
  };
  const endpointActionMock = jest.fn();

  const scheduleNotificationResponseActions = getScheduleNotificationResponseActionsService({
    osqueryCreateActionService: osqueryActionMock,
    endpointAppContextService: endpointActionMock as never,
  });

  const simpleQuery = 'select * from uptime';
  it('should handle osquery response actions with query', async () => {
    const responseActions: RuleResponseAction[] = [
      {
        actionTypeId: RESPONSE_ACTION_TYPES.OSQUERY,
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
    //
  });
  it('should handle osquery response actions with packs', async () => {
    const responseActions: RuleResponseAction[] = [
      {
        actionTypeId: RESPONSE_ACTION_TYPES.OSQUERY,
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
