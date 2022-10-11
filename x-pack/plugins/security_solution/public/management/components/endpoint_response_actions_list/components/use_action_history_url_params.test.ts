/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { actionsLogFiltersFromUrlParams } from './use_action_history_url_params';
import type { ConsoleResponseActionCommands } from '../../../../../common/endpoint/service/response_actions/constants';
import { CONSOLE_RESPONSE_ACTION_COMMANDS } from '../../../../../common/endpoint/service/response_actions/constants';

describe('#actionsLogFiltersFromUrlParams', () => {
  const getConsoleCommandsAsString = (): string => {
    return [...CONSOLE_RESPONSE_ACTION_COMMANDS].sort().join(',');
  };

  const getConsoleCommandsAsArray = (): ConsoleResponseActionCommands[] => {
    return [...CONSOLE_RESPONSE_ACTION_COMMANDS].sort();
  };

  it('should not use invalid command values from URL params', () => {
    expect(actionsLogFiltersFromUrlParams({ commands: 'asa,was' })).toEqual({
      commands: undefined,
      endDate: undefined,
      hosts: undefined,
      startDate: undefined,
      statuses: undefined,
      users: undefined,
    });
  });

  it('should use valid command values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        commands: getConsoleCommandsAsString(),
      })
    ).toEqual({
      commands: getConsoleCommandsAsArray(),
      endDate: undefined,
      hosts: undefined,
      startDate: undefined,
      statuses: undefined,
      users: undefined,
    });
  });

  it('should not use invalid status values from URL params', () => {
    expect(actionsLogFiltersFromUrlParams({ statuses: 'asa,was' })).toEqual({
      commands: undefined,
      endDate: undefined,
      hosts: undefined,
      startDate: undefined,
      statuses: undefined,
      users: undefined,
    });
  });

  it('should use valid status values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        statuses: 'successful,pending,failed',
      })
    ).toEqual({
      commands: undefined,
      endDate: undefined,
      hosts: undefined,
      startDate: undefined,
      statuses: ['failed', 'pending', 'successful'],
      users: undefined,
    });
  });

  it('should use valid command and status along with given host, user and date values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        commands: getConsoleCommandsAsString(),
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
      commands: undefined,
      endDate: 'now',
      hosts: undefined,
      startDate: 'now-24h/h',
      statuses: undefined,
      users: undefined,
    });
  });

  it('should use given absolute startDate and endDate values  URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        startDate: '2022-09-12T08:00:00.000Z',
        endDate: '2022-09-12T08:30:33.140Z',
      })
    ).toEqual({
      commands: undefined,
      endDate: '2022-09-12T08:30:33.140Z',
      hosts: undefined,
      startDate: '2022-09-12T08:00:00.000Z',
      statuses: undefined,
      users: undefined,
    });
  });

  it('should use given hosts values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        hosts: 'agent-id-1,agent-id-2',
      })
    ).toEqual({
      commands: undefined,
      endDate: undefined,
      hosts: ['agent-id-1', 'agent-id-2'],
      startDate: undefined,
      statuses: undefined,
      users: undefined,
    });
  });

  it('should use given users values from URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        users: 'usernameA,usernameB',
      })
    ).toEqual({
      commands: undefined,
      endDate: undefined,
      hosts: undefined,
      startDate: undefined,
      statuses: undefined,
      users: ['usernameA', 'usernameB'],
    });
  });
});
