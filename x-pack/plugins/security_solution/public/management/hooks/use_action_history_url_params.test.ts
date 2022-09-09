/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { actionsLogFiltersFromUrlParams } from './use_action_history_url_params';

describe('#actionsLogFiltersFromUrlParams', () => {
  it('should not use invalid command values to URL params', () => {
    expect(actionsLogFiltersFromUrlParams({ commands: 'asa,was' })).toEqual({
      commands: undefined,
      endDate: undefined,
      hosts: undefined,
      startDate: undefined,
      statuses: undefined,
      users: undefined,
    });
  });

  it('should use valid command values to URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        commands: 'kill-process,isolate,processes,release,suspend-process',
      })
    ).toEqual({
      commands: ['isolate', 'kill-process', 'processes', 'release', 'suspend-process'],
      endDate: undefined,
      hosts: undefined,
      startDate: undefined,
      statuses: undefined,
      users: undefined,
    });
  });

  it('should not use invalid status values to URL params', () => {
    expect(actionsLogFiltersFromUrlParams({ statuses: 'asa,was' })).toEqual({
      commands: undefined,
      endDate: undefined,
      hosts: undefined,
      startDate: undefined,
      statuses: undefined,
      users: undefined,
    });
  });

  it('should use valid status values to URL params', () => {
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

  it('should use valid command and status values to URL params', () => {
    expect(
      actionsLogFiltersFromUrlParams({
        commands: 'release,kill-process,isolate,processes,suspend-process',
        statuses: 'successful,pending,failed',
      })
    ).toEqual({
      commands: ['isolate', 'kill-process', 'processes', 'release', 'suspend-process'],
      endDate: undefined,
      hosts: undefined,
      startDate: undefined,
      statuses: ['failed', 'pending', 'successful'],
      users: undefined,
    });
  });

  it('should use set given relative startDate and endDate values to URL params', () => {
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

  it('should use set given absolute startDate and endDate values to URL params', () => {
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
});
