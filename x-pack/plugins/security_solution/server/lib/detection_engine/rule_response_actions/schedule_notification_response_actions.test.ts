/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scheduleNotificationResponseActions } from './schedule_notification_response_actions';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';

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

  const simpleQuery = 'select * from uptime';
  it('should handle osquery response actions with query', async () => {
    const osqueryActionMock = jest.fn();

    const responseActions = [
      {
        actionTypeId: RESPONSE_ACTION_TYPES.OSQUERY,
        params: {
          ...defaultQueryParams,
          query: simpleQuery,
        },
      },
    ];
    scheduleNotificationResponseActions({ signals, responseActions }, osqueryActionMock);

    expect(osqueryActionMock).toHaveBeenCalledWith({
      ...defaultQueryResultParams,
      query: simpleQuery,
    });
    //
  });
  it('should handle osquery response actions with packs', async () => {
    const osqueryActionMock = jest.fn();

    const responseActions = [
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
    scheduleNotificationResponseActions({ signals, responseActions }, osqueryActionMock);

    expect(osqueryActionMock).toHaveBeenCalledWith({
      ...defaultPackResultParams,
      queries: [{ ...defaultQueries, id: 'query-1', query: simpleQuery }],
    });
  });
});
