/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { actionsLogFiltersFromUrlParams } from './use_action_history_url_params';

import {
  CONSOLE_RESPONSE_ACTION_COMMANDS,
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_TYPE,
  type ConsoleResponseActionCommands,
  type ResponseActionAgentType,
  type ResponseActionType,
} from '../../../../../common/endpoint/service/response_actions/constants';

describe('#actionsLogFiltersFromUrlParams', () => {
  const getConsoleCommandsAsArray = (): ConsoleResponseActionCommands[] => {
    return [...CONSOLE_RESPONSE_ACTION_COMMANDS].sort();
  };

  const getActionTypesAsArray = (): ResponseActionType[] => {
    return [...RESPONSE_ACTION_TYPE].sort();
  };

  const getAgentTypesAsArray = (): ResponseActionAgentType[] => {
    return [...RESPONSE_ACTION_AGENT_TYPE].sort();
  };

  it('should not use invalid `agentType` values from URL params', () => {
    expect(actionsLogFiltersFromUrlParams({ agentTypes: 'asa,was' })).toEqual({});
  });

  it('should use valid `agentTypes` values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        agentTypes: getAgentTypesAsArray().join(),
      })
    ).toEqual({
      agentTypes: getAgentTypesAsArray(),
    });
  });

  it('should not use invalid `types` values from URL params', () => {
    expect(actionsLogFiltersFromUrlParams({ types: 'asa,was' })).toEqual({});
  });

  it('should use valid `types` values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        types: getActionTypesAsArray().join(),
      })
    ).toEqual({
      types: getActionTypesAsArray(),
    });
  });

  it('should not use invalid command values from URL params', () => {
    expect(actionsLogFiltersFromUrlParams({ commands: 'asa,was' })).toEqual({});
  });

  it('should use valid command values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        commands: getConsoleCommandsAsArray().join(),
      })
    ).toEqual({
      commands: getConsoleCommandsAsArray(),
    });
  });

  it('should not use invalid status values from URL params', () => {
    expect(actionsLogFiltersFromUrlParams({ statuses: 'asa,was' })).toEqual({});
  });

  it('should use valid status values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        statuses: 'successful,pending,failed',
      })
    ).toEqual({
      statuses: ['failed', 'pending', 'successful'],
    });
  });

  it('should use valid command and status along with given host, user and date values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        commands: getConsoleCommandsAsArray().join(),
        statuses: 'successful,pending,failed',
        hosts: 'host-1,host-2',
        users: 'user-1,user-2',
        startDate: '2022-09-12T08:00:00.000Z',
        endDate: '2022-09-12T08:30:33.140Z',
      })
    ).toEqual({
      commands: getConsoleCommandsAsArray(),
      endDate: '2022-09-12T08:30:33.140Z',
      hosts: ['host-1', 'host-2'],
      startDate: '2022-09-12T08:00:00.000Z',
      statuses: ['failed', 'pending', 'successful'],
      users: ['user-1', 'user-2'],
    });
  });

  it('should use given relative startDate and endDate values  URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        startDate: 'now-24h/h',
        endDate: 'now',
      })
    ).toEqual({
      endDate: 'now',
      startDate: 'now-24h/h',
    });
  });

  it('should use given absolute startDate and endDate values  URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        startDate: '2022-09-12T08:00:00.000Z',
        endDate: '2022-09-12T08:30:33.140Z',
      })
    ).toEqual({
      endDate: '2022-09-12T08:30:33.140Z',
      startDate: '2022-09-12T08:00:00.000Z',
    });
  });

  it('should use given hosts values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        hosts: 'agent-id-1,agent-id-2',
      })
    ).toEqual({
      hosts: ['agent-id-1', 'agent-id-2'],
    });
  });

  it('should use given users values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        users: 'usernameA,usernameB',
      })
    ).toEqual({
      users: ['usernameA', 'usernameB'],
    });
  });
});
