/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleReducer } from './rule_reducer';
import { Rule } from '../../../types';
import { RuleActionTypes, RuleDefaultAction } from '@kbn/alerting-plugin/common';

describe('rule reducer', () => {
  let initialRule: Rule;

  beforeEach(() => {
    initialRule = {
      params: {},
      consumer: 'rules',
      ruleTypeId: null,
      schedule: {
        interval: '1m',
      },
      actions: [],
      tags: [],
      notifyWhen: 'onActionGroupChange',
    } as unknown as Rule;
  });

  // setRule
  test('if modified rule was reset to initial', () => {
    const rule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setProperty' },
        payload: {
          key: 'name',
          value: 'new name',
        },
      }
    );
    expect(rule.rule.name).toBe('new name');

    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRule' },
        payload: {
          key: 'rule',
          value: initialRule,
        },
      }
    );
    expect(updatedRule.rule.name).toBeUndefined();
  });

  test('if property name was changed', () => {
    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setProperty' },
        payload: {
          key: 'name',
          value: 'new name',
        },
      }
    );
    expect(updatedRule.rule.name).toBe('new name');
  });

  test('if initial schedule property was updated', () => {
    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setScheduleProperty' },
        payload: {
          key: 'interval',
          value: '10s',
        },
      }
    );
    expect(updatedRule.rule.schedule.interval).toBe('10s');
  });

  test('if rule params property was added and updated', () => {
    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleParams' },
        payload: {
          key: 'testParam',
          value: 'new test params property',
        },
      }
    );
    expect(updatedRule.rule.params.testParam).toBe('new test params property');

    const updatedRuleParamsProperty = ruleReducer(
      { rule: updatedRule.rule },
      {
        command: { type: 'setRuleParams' },
        payload: {
          key: 'testParam',
          value: 'test params property updated',
        },
      }
    );
    expect(updatedRuleParamsProperty.rule.params.testParam).toBe('test params property updated');
  });

  test('if rule action params property was added and updated', () => {
    initialRule.actions.push({
      id: '',
      actionTypeId: 'testId',
      group: 'Rule',
      params: {},
      uuid: '123-456',
    });

    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleActionParams' },
        payload: {
          key: 'testActionParam',
          value: 'new test action params property',
          index: 0,
        },
      }
    );

    expect(updatedRule.rule.actions[0].params.testActionParam).toBe(
      'new test action params property'
    );

    const updatedRuleActionParamsProperty = ruleReducer(
      { rule: updatedRule.rule },
      {
        command: { type: 'setRuleActionParams' },
        payload: {
          key: 'testActionParam',
          value: 'test action params property updated',
          index: 0,
        },
      }
    );
    expect(updatedRuleActionParamsProperty.rule.actions[0].params.testActionParam).toBe(
      'test action params property updated'
    );
  });

  test('if the existing rule action params property was set to undefined (when other connector was selected)', () => {
    initialRule.actions.push({
      id: '',
      actionTypeId: 'testId',
      group: 'Rule',
      params: {
        testActionParam: 'some value',
      },
      uuid: '123-456',
    });
    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleActionParams' },
        payload: {
          key: 'testActionParam',
          value: undefined,
          index: 0,
        },
      }
    );
    expect(updatedRule.rule.actions[0].params.testActionParam).toBe(undefined);
  });

  test('does not update the state if the rule params are equal', () => {
    initialRule.actions.push({
      id: '1',
      actionTypeId: 'testId',
      group: 'Rule',
      params: {
        testActionParam: 'some value',
      },
      uuid: '123-456',
    });

    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleActionParams' },
        payload: {
          key: 'testActionParam',
          value: 'some value',
          index: 0,
        },
      }
    );

    expect(updatedRule.rule.actions[0].params).toEqual({ testActionParam: 'some value' });
  });

  test('if rule action property was updated', () => {
    initialRule.actions.push({
      id: '',
      actionTypeId: 'testId',
      group: 'Rule',
      params: {},
      uuid: '123-456',
    });

    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleActionProperty' },
        payload: {
          key: 'group',
          value: 'Warning',
          index: 0,
        },
      }
    );
    expect((updatedRule.rule.actions[0] as RuleDefaultAction).group).toBe('Warning');
  });

  test('if rule action frequency was updated', () => {
    initialRule.actions.push({
      id: '',
      actionTypeId: 'testId',
      group: 'Rule',
      params: {},
      uuid: '123-456',
    });
    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleActionFrequency' },
        payload: {
          key: 'notifyWhen',
          value: 'onThrottleInterval',
          index: 0,
        },
      }
    );
    expect((updatedRule.rule.actions[0] as RuleDefaultAction).frequency?.notifyWhen).toBe(
      'onThrottleInterval'
    );
  });

  test('does not update the state if the action frequency is the same', () => {
    initialRule.actions.push({
      id: '1',
      actionTypeId: 'testId',
      group: 'Rule',
      params: {
        testActionParam: 'some value',
      },
      uuid: '123-456',
      frequency: {
        notifyWhen: 'onThrottleInterval',
        summary: true,
        throttle: null,
      },
    });

    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleActionFrequency' },
        payload: {
          key: 'notifyWhen',
          value: 'onThrottleInterval',
          index: 0,
        },
      }
    );

    expect((updatedRule.rule.actions[0] as RuleDefaultAction).frequency).toEqual({
      notifyWhen: 'onThrottleInterval',
      summary: true,
      throttle: null,
    });
  });

  test('should not update the frequency of a system action', () => {
    const updatedRule = ruleReducer(
      {
        rule: {
          ...initialRule,
          actions: [
            {
              id: '1',
              actionTypeId: 'testId',
              params: {},
              uuid: '123-456',
              type: RuleActionTypes.SYSTEM,
            },
          ],
        },
      },
      {
        command: { type: 'setRuleActionFrequency' },
        payload: {
          key: 'notifyWhen',
          value: 'onThrottleInterval',
          index: 0,
        },
      }
    );

    expect(updatedRule.rule.actions[0]).toEqual({
      id: '1',
      actionTypeId: 'testId',
      params: {},
      uuid: '123-456',
      type: RuleActionTypes.SYSTEM,
    });
  });

  test('updates the action alerts filter correctly', () => {
    initialRule.actions.push({
      id: '1',
      actionTypeId: 'testId',
      group: 'Rule',
      params: {
        testActionParam: 'some value',
      },
      uuid: '123-456',
      alertsFilter: { query: { kql: '{}', filters: [] } },
    });

    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleActionAlertsFilter' },
        payload: {
          key: 'query',
          value: { kql: 'kibana.alert.rule.name:test', filters: [] },
          index: 0,
        },
      }
    );

    expect((updatedRule.rule.actions[0] as RuleDefaultAction).alertsFilter).toEqual({
      query: { kql: 'kibana.alert.rule.name:test', filters: [] },
    });
  });

  test('removes a property from the alerts filter', () => {
    initialRule.actions.push({
      id: '1',
      actionTypeId: 'testId',
      group: 'Rule',
      params: {
        testActionParam: 'some value',
      },
      uuid: '123-456',
      alertsFilter: {
        query: {
          kql: 'kibana.alert.rule.name:test',
          filters: [],
        },
        timeframe: {
          days: [1, 2, 3, 4, 5, 6, 7],
          hours: { start: '08:00', end: '17:00' },
          timezone: 'UTC',
        },
      },
    });

    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleActionAlertsFilter' },
        payload: {
          key: 'timeframe',
          value: null,
          index: 0,
        },
      }
    );

    expect((updatedRule.rule.actions[0] as RuleDefaultAction).alertsFilter).toEqual({
      query: {
        kql: 'kibana.alert.rule.name:test',
        filters: [],
      },
    });
  });

  test('does not update the state if the action alerts filter is the same', () => {
    initialRule.actions.push({
      id: '1',
      actionTypeId: 'testId',
      group: 'Rule',
      params: {
        testActionParam: 'some value',
      },
      uuid: '123-456',
      alertsFilter: { query: { kql: '{}', filters: [] } },
    });

    const updatedRule = ruleReducer(
      { rule: initialRule },
      {
        command: { type: 'setRuleActionAlertsFilter' },
        payload: {
          key: 'query',
          value: { kql: '{}', filters: [] },
          index: 0,
        },
      }
    );

    expect((updatedRule.rule.actions[0] as RuleDefaultAction).alertsFilter).toEqual({
      query: { kql: '{}', filters: [] },
    });
  });

  test('should not update the alerts filter of a system action', () => {
    const updatedRule = ruleReducer(
      {
        rule: {
          ...initialRule,
          actions: [
            {
              id: '1',
              actionTypeId: 'testId',
              params: {},
              uuid: '123-456',
              type: RuleActionTypes.SYSTEM,
            },
          ],
        },
      },
      {
        command: { type: 'setRuleActionAlertsFilter' },
        payload: {
          key: 'query',
          value: { kql: '{}', filters: [] },
          index: 0,
        },
      }
    );

    expect(updatedRule.rule.actions[0]).toEqual({
      id: '1',
      actionTypeId: 'testId',
      params: {},
      uuid: '123-456',
      type: RuleActionTypes.SYSTEM,
    });
  });
});
