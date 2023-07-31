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
  actions: [defaultAction],
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

  it('should rewrite default actions correctly', () => {
    const rewritten = rewriteRule(sampleRule);
    for (const rewrittenAction of rewritten.actions) {
      expect(Object.keys(rewrittenAction)).toEqual(
        expect.arrayContaining(['group', 'id', 'connector_type_id', 'params', 'frequency'])
      );

      expect(
        Object.keys((rewrittenAction as Omit<RuleDefaultAction, 'actionTypeId'>).frequency!)
      ).toEqual(expect.arrayContaining(['summary', 'notify_when', 'throttle']));
    }
  });

  it('should rewrite system actions correctly', () => {
    const rewritten = rewriteRule({ ...sampleRule, actions: [systemAction] });
    expect(Object.keys(rewritten.actions[0])).toEqual(
      expect.arrayContaining(['id', 'connector_type_id', 'params', 'uuid', 'type'])
    );

    expect(Object.keys(rewritten.actions[0])).not.toEqual(
      expect.arrayContaining(['group', 'frequency', 'alertsFilter'])
    );
  });
});
