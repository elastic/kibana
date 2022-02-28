/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import React, { Fragment } from 'react';
import {
  validateBaseProperties,
  getRuleErrors,
  getRuleActionErrors,
  hasObjectErrors,
  isValidRule,
} from './rule_errors';
import { Rule, RuleType, RuleTypeModel } from '../../../types';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';

describe('rule_errors', () => {
  describe('validateBaseProperties()', () => {
    it('should validate the name', () => {
      const rule = mockRule();
      rule.name = '';
      const result = validateBaseProperties(rule);
      expect(result.errors).toStrictEqual({
        name: ['Name is required.'],
        interval: [],
        ruleTypeId: [],
        actionConnectors: [],
      });
    });

    it('should validate the interval', () => {
      const rule = mockRule();
      rule.schedule.interval = '';
      const result = validateBaseProperties(rule);
      expect(result.errors).toStrictEqual({
        name: [],
        interval: ['Check interval is required.'],
        ruleTypeId: [],
        actionConnectors: [],
      });
    });

    it('should validate the minimumScheduleInterval', () => {
      const rule = mockRule();
      rule.schedule.interval = '2m';
      const result = validateBaseProperties(
        rule,
        mockserverRuleType({ minimumScheduleInterval: '5m' })
      );
      expect(result.errors).toStrictEqual({
        name: [],
        interval: ['Interval is below minimum (5m) for this rule type'],
        ruleTypeId: [],
        actionConnectors: [],
      });
    });

    it('should validate the ruleTypeId', () => {
      const rule = mockRule();
      rule.ruleTypeId = '';
      const result = validateBaseProperties(rule);
      expect(result.errors).toStrictEqual({
        name: [],
        interval: [],
        ruleTypeId: ['Rule type is required.'],
        actionConnectors: [],
      });
    });

    it('should validate the connectors', () => {
      const rule = mockRule();
      rule.actions = [
        {
          id: '1234',
          actionTypeId: 'myActionType',
          group: '',
          params: {
            name: 'yes',
          },
        },
      ];
      const result = validateBaseProperties(rule);
      expect(result.errors).toStrictEqual({
        name: [],
        interval: [],
        ruleTypeId: [],
        actionConnectors: ['Action for myActionType connector is required.'],
      });
    });
  });

  describe('getRuleErrors()', () => {
    it('should return all errors', () => {
      const result = getRuleErrors(
        mockRule({
          name: '',
        }),
        mockRuleTypeModel({
          validate: () => ({
            errors: {
              field: ['This is wrong'],
            },
          }),
        }),
        mockserverRuleType()
      );
      expect(result).toStrictEqual({
        ruleParamsErrors: { field: ['This is wrong'] },
        ruleBaseErrors: {
          name: ['Name is required.'],
          interval: [],
          ruleTypeId: [],
          actionConnectors: [],
        },
        ruleErrors: {
          name: ['Name is required.'],
          field: ['This is wrong'],
          interval: [],
          ruleTypeId: [],
          actionConnectors: [],
        },
      });
    });
  });

  describe('getRuleActionErrors()', () => {
    it('should return an array of errors', async () => {
      const actionTypeRegistry = actionTypeRegistryMock.create();
      actionTypeRegistry.get.mockImplementation((actionTypeId: string) => ({
        ...actionTypeRegistryMock.createMockActionTypeModel(),
        validateParams: jest.fn().mockImplementation(() => ({
          errors: {
            [actionTypeId]: ['Yes, this failed'],
          },
        })),
      }));
      const result = await getRuleActionErrors(
        mockRule({
          actions: [
            {
              id: '1234',
              actionTypeId: 'myActionType',
              group: '',
              params: {
                name: 'yes',
              },
            },
            {
              id: '5678',
              actionTypeId: 'myActionType2',
              group: '',
              params: {
                name: 'yes',
              },
            },
          ],
        }),
        actionTypeRegistry
      );
      expect(result).toStrictEqual([
        {
          myActionType: ['Yes, this failed'],
        },
        {
          myActionType2: ['Yes, this failed'],
        },
      ]);
    });
  });

  describe('hasObjectErrors()', () => {
    it('should return true for any errors', () => {
      expect(
        hasObjectErrors({
          foo: ['1'],
        })
      ).toBe(true);
      expect(
        hasObjectErrors({
          foo: {
            foo: ['1'],
          },
        })
      ).toBe(true);
    });
    it('should return false for no errors', () => {
      expect(hasObjectErrors({})).toBe(false);
    });
  });

  describe('isValidRule()', () => {
    it('should return true for a valid rule', () => {
      const result = isValidRule(mockRule(), {}, []);
      expect(result).toBe(true);
    });
    it('should return false for an invalid rule', () => {
      expect(
        isValidRule(
          mockRule(),
          {
            name: ['This is wrong'],
          },
          []
        )
      ).toBe(false);
      expect(
        isValidRule(mockRule(), {}, [
          {
            name: ['This is wrong'],
          },
        ])
      ).toBe(false);
    });
  });
});

function mockserverRuleType(
  overloads: Partial<RuleType<string, string>> = {}
): RuleType<string, string> {
  return {
    actionGroups: [],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    recoveryActionGroup: {
      id: 'recovery',
      name: 'doRecovery',
    },
    id: 'myAppRuleType',
    name: 'myAppRuleType',
    producer: 'myApp',
    authorizedConsumers: {},
    enabledInLicense: true,
    actionVariables: {
      context: [],
      state: [],
      params: [],
    },
    ...overloads,
  };
}

function mockRuleTypeModel(overloads: Partial<RuleTypeModel> = {}): RuleTypeModel {
  return {
    id: 'ruleTypeModel',
    description: 'some rule',
    iconClass: 'something',
    documentationUrl: null,
    validate: () => ({ errors: {} }),
    ruleParamsExpression: () => <Fragment />,
    requiresAppContext: false,
    ...overloads,
  };
}

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `rule-${uuid.v4()}`,
    tags: [],
    ruleTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}
