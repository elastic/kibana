/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedRule } from '../types';

type MockedRule = SanitizedRule<{
  bar: boolean;
}>;

const DATE_2020 = '2020-01-01T00:00:00Z';

export function createMockedRule(overrides: Partial<MockedRule> = {}) {
  const mockedRule: MockedRule = {
    id: '1',
    alertTypeId: '1',
    schedule: { interval: '10s' },
    params: {
      bar: true,
    },
    createdAt: new Date(DATE_2020),
    updatedAt: new Date(DATE_2020),
    actions: [
      {
        group: 'default',
        id: '2',
        actionTypeId: 'test',
        params: {
          foo: true,
        },
        frequency: {
          summary: false,
          notifyWhen: 'onActionGroupChange',
          throttle: null,
        },
      },
    ],
    consumer: 'bar',
    name: 'abc',
    tags: ['foo'],
    enabled: true,
    muteAll: false,
    createdBy: '',
    updatedBy: '',
    apiKeyOwner: '',
    throttle: null,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date(DATE_2020),
    },
    ...overrides,
  };

  return mockedRule;
}
