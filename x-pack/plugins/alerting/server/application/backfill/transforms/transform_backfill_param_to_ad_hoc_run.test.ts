/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adHocRunStatus } from '../../../../common/constants';
import { RuleDomain } from '../../rule/types';
import { ScheduleBackfillParam } from '../methods/schedule/types';
import { transformBackfillParamToAdHocRun } from './transform_backfill_param_to_ad_hoc_run';

function getMockData(overwrites: Record<string, unknown> = {}): ScheduleBackfillParam {
  return {
    ruleId: '1',
    start: '2023-11-16T08:00:00.000Z',
    ...overwrites,
  };
}

const MOCK_API_KEY = Buffer.from('123:abc').toString('base64');
function getMockRule(overwrites: Record<string, unknown> = {}): RuleDomain {
  return {
    id: '1',
    actions: [],
    alertTypeId: 'myType',
    apiKey: MOCK_API_KEY,
    apiKeyCreatedByUser: false,
    apiKeyOwner: 'user',
    consumer: 'myApp',
    createdAt: new Date('2019-02-12T21:01:22.479Z'),
    createdBy: 'user',
    enabled: true,
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
      status: 'pending',
    },
    muteAll: false,
    mutedInstanceIds: [],
    name: 'my rule name',
    notifyWhen: null,
    // @ts-expect-error
    params: {},
    revision: 0,
    schedule: { interval: '12h' },
    scheduledTaskId: 'task-123',
    snoozeSchedule: [],
    tags: ['foo'],
    throttle: null,
    updatedAt: new Date('2019-02-12T21:01:22.479Z'),
    updatedBy: 'user',
    ...overwrites,
  };
}

describe('transformBackfillParamToAdHocRun', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-30T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should transform backfill param with start', () => {
    expect(transformBackfillParamToAdHocRun(getMockData(), getMockRule(), 'default')).toEqual({
      apiKeyId: '123',
      apiKeyToUse: 'MTIzOmFiYw==',
      createdAt: '2024-01-30T00:00:00.000Z',
      duration: '12h',
      enabled: true,
      // injects end parameter
      end: '2023-11-16T20:00:00.000Z',
      rule: {
        name: 'my rule name',
        tags: ['foo'],
        alertTypeId: 'myType',
        params: {},
        apiKeyOwner: 'user',
        apiKeyCreatedByUser: false,
        consumer: 'myApp',
        enabled: true,
        schedule: {
          interval: '12h',
        },
        createdBy: 'user',
        updatedBy: 'user',
        createdAt: '2019-02-12T21:01:22.479Z',
        updatedAt: '2019-02-12T21:01:22.479Z',
        revision: 0,
      },
      spaceId: 'default',
      start: '2023-11-16T08:00:00.000Z',
      status: adHocRunStatus.PENDING,
      schedule: [
        {
          runAt: '2023-11-16T20:00:00.000Z',
          interval: '12h',
          status: adHocRunStatus.PENDING,
        },
      ],
    });
  });

  test('should transform backfill param with start and end', () => {
    expect(
      transformBackfillParamToAdHocRun(
        getMockData({ end: '2023-11-17T08:00:00.000Z' }),
        getMockRule(),
        'default'
      )
    ).toEqual({
      apiKeyId: '123',
      apiKeyToUse: 'MTIzOmFiYw==',
      createdAt: '2024-01-30T00:00:00.000Z',
      duration: '12h',
      enabled: true,
      end: '2023-11-17T08:00:00.000Z',
      rule: {
        name: 'my rule name',
        tags: ['foo'],
        alertTypeId: 'myType',
        params: {},
        apiKeyOwner: 'user',
        apiKeyCreatedByUser: false,
        consumer: 'myApp',
        enabled: true,
        schedule: {
          interval: '12h',
        },
        createdBy: 'user',
        updatedBy: 'user',
        createdAt: '2019-02-12T21:01:22.479Z',
        updatedAt: '2019-02-12T21:01:22.479Z',
        revision: 0,
      },
      spaceId: 'default',
      start: '2023-11-16T08:00:00.000Z',
      status: adHocRunStatus.PENDING,
      schedule: [
        {
          runAt: '2023-11-16T20:00:00.000Z',
          interval: '12h',
          status: adHocRunStatus.PENDING,
        },
        {
          runAt: '2023-11-17T08:00:00.000Z',
          interval: '12h',
          status: adHocRunStatus.PENDING,
        },
      ],
    });
  });
});
