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
  it('should handle osquery response actions and convert params', async () => {
    const osqueryActionMock = jest.fn();

    const defaultQueries = {
      ecs_mapping: undefined,
      platform: 'windows',
      version: '1.0.0',
    };

    const defaultQueryParams = {
      ecsMapping: { testField: { field: 'testField', value: 'testValue' } },
      id: 'test1',
      savedQueryId: 'testSavedQueryId',
      query: undefined,
      queries: [],
      packId: undefined,
    };
    const defaultPackParams = {
      id: 'test1',
      packId: 'testPackId',
      queries: [],
      query: undefined,
      ecsMapping: { testField: { field: 'testField', value: 'testValue' } },
      savedQueryId: undefined,
    };

    const defaultResultParams = {
      agent_ids: ['agent-id-1', 'agent-id-2'],
      alert_ids: ['alert-id-1', 'alert-id-2'],
      id: 'test1',
    };
    const defaultQueryResultParams = {
      ...defaultResultParams,
      ecs_mapping: { testField: { field: 'testField', value: 'testValue' } },
      ecsMapping: undefined,
      saved_query_id: 'testSavedQueryId',
      savedQueryId: undefined,
    };
    const defaultPackResultParams = {
      ...defaultResultParams,
      id: 'test1',
      pack_id: undefined,
      packId: undefined,
    };

    const simpleQuery = 'select * from uptime';
    const agentQuery = `select * from uptime where agent = {{agent.id}}`;
    const agentQueryReplaced = `select * from uptime where agent = agent-id-1`;
    const complexQuery = `select * FROM registry WHERE key LIKE 'HKEY_USERS\{{user.id}}\Software\Microsoft\IdentityCRL\Immersive\production\Token\{0CB4A94A-6E8C-477B-88C8-A3799FC97414}'`;
    const complexQueryReplaced = `select * FROM registry WHERE key LIKE 'HKEY_USERS\S-1-5-20\Software\Microsoft\IdentityCRL\Immersive\production\Token\{0CB4A94A-6E8C-477B-88C8-A3799FC97414}'`;
    const responseActions = [
      {
        actionTypeId: RESPONSE_ACTION_TYPES.OSQUERY,
        params: {
          ...defaultQueryParams,
          query: simpleQuery,
        },
      },
      {
        actionTypeId: RESPONSE_ACTION_TYPES.OSQUERY,
        params: {
          ...defaultQueryParams,
          query: complexQuery,
        },
      },
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
      {
        actionTypeId: RESPONSE_ACTION_TYPES.OSQUERY,
        params: {
          ...defaultPackParams,
          queries: [
            {
              ...defaultQueries,

              id: 'query-1',
              query: complexQuery,
            },
            {
              ...defaultQueries,

              id: 'query-2',
              query: agentQuery,
            },
          ],
          packId: 'testPackId',
        },
      },
    ];

    // @ts-expect-error we don't need to pass in the full context
    scheduleNotificationResponseActions({ signals, responseActions }, osqueryActionMock);

    expect(osqueryActionMock).toHaveBeenCalledWith(
      {
        ...defaultQueryResultParams,
        query: simpleQuery,
      },
      signalOne
    );
    expect(osqueryActionMock).toHaveBeenCalledWith(
      {
        ...defaultQueryResultParams,
        query: complexQueryReplaced,
      },
      signalOne
    );
    expect(osqueryActionMock).toHaveBeenCalledWith({
      ...defaultPackResultParams,
      queries: [{ ...defaultQueries, id: 'query-1', query: simpleQuery }],
    });
    expect(osqueryActionMock).toHaveBeenCalledWith(
      {
        ...defaultPackResultParams,
        queries: [
          {
            ...defaultQueries,
            id: 'query-1',
            query: complexQueryReplaced,
          },
          { ...defaultQueries, id: 'query-2', query: agentQueryReplaced },
        ],
      },
      {}
    );
  });
});
