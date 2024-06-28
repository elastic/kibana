/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
} from '../../common';
import { NormalizedRuleType } from '../rule_type_registry';
import { convertPolicyToActions, generateActionUuid } from './notification_utils';

const ruleType: NormalizedRuleType<
  RuleTypeParams,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  'default' | 'other-group',
  'recovered',
  {}
> = {
  id: 'test',
  name: 'Test',
  actionGroups: [
    { id: 'default', name: 'Default' },
    { id: 'recovered', name: 'Recovered' },
    { id: 'other-group', name: 'Other Group' },
  ],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  validate: {
    params: schema.any(),
  },
  alerts: {
    context: 'context',
    mappings: { fieldMap: { field: { type: 'fieldType', required: false } } },
  },
  autoRecoverAlerts: false,
  validLegacyConsumers: [],
};

describe('convertPolicyToActions', () => {
  it('should convert policy to actions 1', () => {
    expect(
      convertPolicyToActions(
        {
          id: '1',
          name: 'test 1',
          alertType: ['summary'],
          connectors: [
            {
              id: 'slack',
              actionTypeId: '.slack',
              params: {
                message: '{{alert.id}} slack',
              },
            },
            {
              id: 'preconfigured-server-log',
              actionTypeId: '.server-log',
              params: {
                level: 'info',
                message: '{{alert.id}} server log',
              },
            },
          ],
          frequency: 'onActiveAlert',
          conditions: [
            {
              type: 'active_action_group',
              value: ['.es-query'],
            },
          ],
        },
        ruleType
      )
    ).toEqual([
      {
        group: 'default',
        id: 'slack',
        actionTypeId: '.slack',
        params: {
          message: '{{alert.id}} slack',
        },
        frequency: {
          summary: true,
          throttle: null,
          notifyWhen: 'onActiveAlert',
        },
        uuid: generateActionUuid(['default', 'summary', 'slack', '.slack', 'onActiveAlert']),
      },
      {
        group: 'default',
        id: 'preconfigured-server-log',
        actionTypeId: '.server-log',
        params: {
          level: 'info',
          message: '{{alert.id}} server log',
        },
        frequency: {
          summary: true,
          throttle: null,
          notifyWhen: 'onActiveAlert',
        },
        uuid: generateActionUuid([
          'default',
          'summary',
          'preconfigured-server-log',
          '.server-log',
          'onActiveAlert',
        ]),
      },
    ]);
  });

  it('should convert policy to actions 2', () => {
    expect(
      convertPolicyToActions(
        {
          id: '2',
          name: 'test 2',
          alertType: ['summary', 'per-alert'],
          connectors: [
            {
              id: 'slack',
              actionTypeId: '.slack',
              params: {
                message: '{{alert.id}} slack',
              },
            },
            {
              id: 'preconfigured-server-log',
              actionTypeId: '.server-log',
              params: {
                level: 'info',
                message: '{{alert.id}} server log',
              },
            },
          ],
          frequency: 'onActionGroupChange',
          conditions: [
            {
              type: 'tags',
              value: ['qa'],
            },
          ],
        },
        ruleType
      )
    ).toEqual([
      {
        group: 'default',
        id: 'slack',
        actionTypeId: '.slack',
        params: {
          message: '{{alert.id}} slack',
        },
        frequency: {
          summary: false,
          throttle: null,
          notifyWhen: 'onActionGroupChange',
        },
        uuid: generateActionUuid([
          'default',
          'per-alert',
          'slack',
          '.slack',
          'onActionGroupChange',
        ]),
      },
      {
        group: 'recovered',
        id: 'slack',
        actionTypeId: '.slack',
        params: {
          message: '{{alert.id}} slack',
        },
        frequency: {
          summary: false,
          throttle: null,
          notifyWhen: 'onActionGroupChange',
        },
        uuid: generateActionUuid([
          'recovered',
          'per-alert',
          'slack',
          '.slack',
          'onActionGroupChange',
        ]),
      },
      {
        group: 'other-group',
        id: 'slack',
        actionTypeId: '.slack',
        params: {
          message: '{{alert.id}} slack',
        },
        frequency: {
          summary: false,
          throttle: null,
          notifyWhen: 'onActionGroupChange',
        },
        uuid: generateActionUuid([
          'other-group',
          'per-alert',
          'slack',
          '.slack',
          'onActionGroupChange',
        ]),
      },
      {
        group: 'default',
        id: 'preconfigured-server-log',
        actionTypeId: '.server-log',
        params: {
          level: 'info',
          message: '{{alert.id}} server log',
        },
        frequency: {
          summary: false,
          throttle: null,
          notifyWhen: 'onActionGroupChange',
        },
        uuid: generateActionUuid([
          'default',
          'per-alert',
          'preconfigured-server-log',
          '.server-log',
          'onActionGroupChange',
        ]),
      },
      {
        group: 'recovered',
        id: 'preconfigured-server-log',
        actionTypeId: '.server-log',
        params: {
          level: 'info',
          message: '{{alert.id}} server log',
        },
        frequency: {
          summary: false,
          throttle: null,
          notifyWhen: 'onActionGroupChange',
        },
        uuid: generateActionUuid([
          'recovered',
          'per-alert',
          'preconfigured-server-log',
          '.server-log',
          'onActionGroupChange',
        ]),
      },
      {
        group: 'other-group',
        id: 'preconfigured-server-log',
        actionTypeId: '.server-log',
        params: {
          level: 'info',
          message: '{{alert.id}} server log',
        },
        frequency: {
          summary: false,
          throttle: null,
          notifyWhen: 'onActionGroupChange',
        },
        uuid: generateActionUuid([
          'other-group',
          'per-alert',
          'preconfigured-server-log',
          '.server-log',
          'onActionGroupChange',
        ]),
      },
    ]);
  });

  it('should convert policy to actions 3', () => {
    expect(
      convertPolicyToActions(
        {
          id: '3',
          name: 'test 3',
          alertType: ['summary', 'per-alert'],
          connectors: [
            {
              id: 'slack',
              actionTypeId: '.slack',
              params: {
                message: '{{alert.id}} slack',
              },
            },
            {
              id: 'preconfigured-server-log',
              actionTypeId: '.server-log',
              params: {
                level: 'info',
                message: '{{alert.id}} server log',
              },
            },
          ],
          frequency: 'onThrottleInterval',
          throttle: '1h',
          conditions: [
            {
              type: 'name',
              value: ['test*'],
            },
          ],
        },
        ruleType
      )
    ).toEqual([
      {
        group: 'default',
        id: 'slack',
        actionTypeId: '.slack',
        params: {
          message: '{{alert.id}} slack',
        },
        frequency: {
          summary: true,
          throttle: '1h',
          notifyWhen: 'onThrottleInterval',
        },
        uuid: generateActionUuid(['default', 'summary', 'slack', '.slack', 'onThrottleInterval']),
      },
      {
        group: 'default',
        id: 'slack',
        actionTypeId: '.slack',
        params: {
          message: '{{alert.id}} slack',
        },
        frequency: {
          summary: false,
          throttle: '1h',
          notifyWhen: 'onThrottleInterval',
        },
        uuid: generateActionUuid(['default', 'per-alert', 'slack', '.slack', 'onThrottleInterval']),
      },
      {
        group: 'recovered',
        id: 'slack',
        actionTypeId: '.slack',
        params: {
          message: '{{alert.id}} slack',
        },
        frequency: {
          summary: false,
          throttle: '1h',
          notifyWhen: 'onThrottleInterval',
        },
        uuid: generateActionUuid([
          'recovered',
          'per-alert',
          'slack',
          '.slack',
          'onThrottleInterval',
        ]),
      },
      {
        group: 'other-group',
        id: 'slack',
        actionTypeId: '.slack',
        params: {
          message: '{{alert.id}} slack',
        },
        frequency: {
          summary: false,
          throttle: '1h',
          notifyWhen: 'onThrottleInterval',
        },
        uuid: generateActionUuid([
          'other-group',
          'per-alert',
          'slack',
          '.slack',
          'onThrottleInterval',
        ]),
      },
      {
        group: 'default',
        id: 'preconfigured-server-log',
        actionTypeId: '.server-log',
        params: {
          level: 'info',
          message: '{{alert.id}} server log',
        },
        frequency: {
          summary: true,
          throttle: '1h',
          notifyWhen: 'onThrottleInterval',
        },
        uuid: generateActionUuid([
          'default',
          'summary',
          'preconfigured-server-log',
          '.server-log',
          'onThrottleInterval',
        ]),
      },
      {
        group: 'default',
        id: 'preconfigured-server-log',
        actionTypeId: '.server-log',
        params: {
          level: 'info',
          message: '{{alert.id}} server log',
        },
        frequency: {
          summary: false,
          throttle: '1h',
          notifyWhen: 'onThrottleInterval',
        },
        uuid: generateActionUuid([
          'default',
          'per-alert',
          'preconfigured-server-log',
          '.server-log',
          'onThrottleInterval',
        ]),
      },
      {
        group: 'recovered',
        id: 'preconfigured-server-log',
        actionTypeId: '.server-log',
        params: {
          level: 'info',
          message: '{{alert.id}} server log',
        },
        frequency: {
          summary: false,
          throttle: '1h',
          notifyWhen: 'onThrottleInterval',
        },
        uuid: generateActionUuid([
          'recovered',
          'per-alert',
          'preconfigured-server-log',
          '.server-log',
          'onThrottleInterval',
        ]),
      },
      {
        group: 'other-group',
        id: 'preconfigured-server-log',
        actionTypeId: '.server-log',
        params: {
          level: 'info',
          message: '{{alert.id}} server log',
        },
        frequency: {
          summary: false,
          throttle: '1h',
          notifyWhen: 'onThrottleInterval',
        },
        uuid: generateActionUuid([
          'other-group',
          'per-alert',
          'preconfigured-server-log',
          '.server-log',
          'onThrottleInterval',
        ]),
      },
    ]);
  });

  it('should convert policy to actions 4', () => {
    expect(
      convertPolicyToActions(
        {
          id: '4',
          name: 'test 4',
          alertType: ['per-alert'],
          connectors: [
            {
              id: 'slack',
              actionTypeId: '.slack',
              params: {
                message: '{{alert.id}} slack',
              },
            },
            {
              id: 'preconfigured-server-log',
              actionTypeId: '.server-log',
              params: {
                level: 'info',
                message: '{{alert.id}} server log',
              },
            },
          ],
          frequency: 'onActiveAlert',
          conditions: [
            {
              type: 'name',
              value: ['test*'],
            },
            {
              type: 'recovered_action_group',
              value: ['all'],
            },
          ],
        },
        ruleType
      )
    ).toEqual([
      {
        group: 'recovered',
        id: 'slack',
        actionTypeId: '.slack',
        params: {
          message: '{{alert.id}} slack',
        },
        frequency: {
          summary: false,
          throttle: null,
          notifyWhen: 'onActiveAlert',
        },
        uuid: generateActionUuid(['recovered', 'per-alert', 'slack', '.slack', 'onActiveAlert']),
      },
      {
        group: 'recovered',
        id: 'preconfigured-server-log',
        actionTypeId: '.server-log',
        params: {
          level: 'info',
          message: '{{alert.id}} server log',
        },
        frequency: {
          summary: false,
          throttle: null,
          notifyWhen: 'onActiveAlert',
        },
        uuid: generateActionUuid([
          'recovered',
          'per-alert',
          'preconfigured-server-log',
          '.server-log',
          'onActiveAlert',
        ]),
      },
    ]);
  });
});
