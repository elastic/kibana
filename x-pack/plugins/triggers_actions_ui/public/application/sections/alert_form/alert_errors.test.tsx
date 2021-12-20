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
  getAlertErrors,
  getAlertActionErrors,
  hasObjectErrors,
  isValidAlert,
} from './alert_errors';
import { Rule, RuleType, RuleTypeModel } from '../../../types';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';

describe('alert_errors', () => {
  describe('validateBaseProperties()', () => {
    it('should validate the name', () => {
      const alert = mockAlert();
      alert.name = '';
      const result = validateBaseProperties(alert);
      expect(result.errors).toStrictEqual({
        name: ['Name is required.'],
        interval: [],
        alertTypeId: [],
        actionConnectors: [],
      });
    });

    it('should validate the interval', () => {
      const alert = mockAlert();
      alert.schedule.interval = '';
      const result = validateBaseProperties(alert);
      expect(result.errors).toStrictEqual({
        name: [],
        interval: ['Check interval is required.'],
        alertTypeId: [],
        actionConnectors: [],
      });
    });

    it('should validate the minimumScheduleInterval', () => {
      const alert = mockAlert();
      alert.schedule.interval = '2m';
      const result = validateBaseProperties(
        alert,
        mockserverRuleType({ minimumScheduleInterval: '5m' })
      );
      expect(result.errors).toStrictEqual({
        name: [],
        interval: ['Interval is below minimum (5m) for this rule type'],
        alertTypeId: [],
        actionConnectors: [],
      });
    });

    it('should validate the alertTypeId', () => {
      const alert = mockAlert();
      alert.alertTypeId = '';
      const result = validateBaseProperties(alert);
      expect(result.errors).toStrictEqual({
        name: [],
        interval: [],
        alertTypeId: ['Rule type is required.'],
        actionConnectors: [],
      });
    });

    it('should validate the connectors', () => {
      const alert = mockAlert();
      alert.actions = [
        {
          id: '1234',
          actionTypeId: 'myActionType',
          group: '',
          params: {
            name: 'yes',
          },
        },
      ];
      const result = validateBaseProperties(alert);
      expect(result.errors).toStrictEqual({
        name: [],
        interval: [],
        alertTypeId: [],
        actionConnectors: ['Action for myActionType connector is required.'],
      });
    });
  });

  describe('getAlertErrors()', () => {
    it('should return all errors', () => {
      const result = getAlertErrors(
        mockAlert({
          name: '',
        }),
        mockAlertTypeModel({
          validate: () => ({
            errors: {
              field: ['This is wrong'],
            },
          }),
        }),
        mockserverRuleType()
      );
      expect(result).toStrictEqual({
        alertParamsErrors: { field: ['This is wrong'] },
        alertBaseErrors: {
          name: ['Name is required.'],
          interval: [],
          alertTypeId: [],
          actionConnectors: [],
        },
        alertErrors: {
          name: ['Name is required.'],
          field: ['This is wrong'],
          interval: [],
          alertTypeId: [],
          actionConnectors: [],
        },
      });
    });
  });

  describe('getAlertActionErrors()', () => {
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
      const result = await getAlertActionErrors(
        mockAlert({
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

  describe('isValidAlert()', () => {
    it('should return true for a valid alert', () => {
      const result = isValidAlert(mockAlert(), {}, []);
      expect(result).toBe(true);
    });
    it('should return false for an invalid alert', () => {
      expect(
        isValidAlert(
          mockAlert(),
          {
            name: ['This is wrong'],
          },
          []
        )
      ).toBe(false);
      expect(
        isValidAlert(mockAlert(), {}, [
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
    id: 'myAppAlertType',
    name: 'myAppAlertType',
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

function mockAlertTypeModel(overloads: Partial<RuleTypeModel> = {}): RuleTypeModel {
  return {
    id: 'alertTypeModel',
    description: 'some alert',
    iconClass: 'something',
    documentationUrl: null,
    validate: () => ({ errors: {} }),
    ruleParamsExpression: () => <Fragment />,
    requiresAppContext: false,
    ...overloads,
  };
}

function mockAlert(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `alert-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
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
