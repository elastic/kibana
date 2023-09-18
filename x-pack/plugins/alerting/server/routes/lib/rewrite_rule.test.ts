/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rewriteRule } from './rewrite_rule';
import {
  RuleActionTypes,
  RuleDefaultAction,
  RuleSystemAction,
  RuleTypeParams,
  SanitizedRule,
} from '../../types';
import { isPlainObject } from 'lodash';

const DATE_2020 = new Date('1/1/2020');

const defaultAction: RuleDefaultAction = {
  group: 'default',
  id: 'aaa',
  actionTypeId: 'bbb',
  params: {},
  frequency: {
    summary: false,
    notifyWhen: 'onThrottleInterval',
    throttle: '1m',
  },
  alertsFilter: { query: { kql: 'test:1', dsl: '{}', filters: [] } },
  type: RuleActionTypes.DEFAULT,
};

const systemAction: RuleSystemAction = {
  id: 'system-action',
  uuid: '123',
  actionTypeId: 'bbb',
  params: {},
  type: RuleActionTypes.SYSTEM,
};

const sampleRule: SanitizedRule<RuleTypeParams> & { activeSnoozes?: string[] } = {
  id: 'aaaa',
  name: 'Sample Rule',
  enabled: true,
  tags: [],
  consumer: 'xxxx',
  schedule: { interval: '1m' },
  params: {},
  alertTypeId: 'abc123',
  createdBy: 'user',
  updatedBy: 'user',
  createdAt: DATE_2020,
  updatedAt: DATE_2020,
  apiKeyOwner: 'owner',
  notifyWhen: null,
  muteAll: false,
  mutedInstanceIds: ['abc', '123'],
  executionStatus: {
    status: 'ok',
    lastExecutionDate: DATE_2020,
    lastDuration: 1000,
  },
  actions: [defaultAction, systemAction],
  scheduledTaskId: 'xyz456',
  snoozeSchedule: [],
  isSnoozedUntil: null,
  activeSnoozes: [],
  lastRun: {
    outcome: 'succeeded',
    outcomeMsg: null,
    alertsCount: {
      active: 1,
      new: 1,
      recovered: 1,
      ignored: 1,
    },
  },
  nextRun: DATE_2020,
  revision: 0,
};

describe('rewriteRule', () => {
  it('should not camelCase any property names', () => {
    const rewritten = rewriteRule(sampleRule);
    for (const [key, val] of Object.entries(rewritten)) {
      expect(key.toLowerCase()).toEqual(key);
      if (isPlainObject(val)) {
        for (const keyO of Object.keys(rewritten)) {
          expect(keyO.toLowerCase()).toEqual(keyO);
        }
      }
    }
  });

  it('should rewrite actions correctly', () => {
    const res = rewriteRule(sampleRule);
    expect(res.actions).toMatchInlineSnapshot(`
      Array [
        Object {
          "alerts_filter": Object {
            "query": Object {
              "dsl": "{}",
              "filters": Array [],
              "kql": "test:1",
            },
          },
          "connector_type_id": "bbb",
          "frequency": Object {
            "notify_when": "onThrottleInterval",
            "summary": false,
            "throttle": "1m",
          },
          "group": "default",
          "id": "aaa",
          "params": Object {},
        },
        Object {
          "connector_type_id": "bbb",
          "id": "system-action",
          "params": Object {},
          "uuid": "123",
        },
      ]
    `);
  });
});
