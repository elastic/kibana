/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { AlertRule } from '../types';
import { buildUpdatedRecoveredAlert } from './build_updated_recovered_alert';

const rule = {
  category: 'My test rule',
  consumer: 'bar',
  execution: {
    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  },
  name: 'rule-name',
  parameters: {
    bar: true,
  },
  producer: 'alerts',
  revision: 0,
  rule_type_id: 'test.rule-type',
  tags: ['rule-', '-tags'],
  uuid: '1',
};

const alertRule: AlertRule = {
  kibana: {
    alert: {
      rule,
    },
    space_ids: ['default'],
  },
};

const existingRecoveredAlert = {
  '@timestamp': '2023-03-28T12:27:28.159Z',
  kibana: {
    alert: {
      action_group: 'recovered',
      duration: {
        us: '0',
      },
      end: '2023-03-28T12:27:28.159Z',
      flapping: false,
      flapping_history: [true, false, false],
      instance: {
        id: 'alert-A',
      },
      maintenance_window_ids: ['maint-x'],
      start: '2023-03-27T12:27:28.159Z',
      rule,
      status: 'recovered',
      uuid: 'abcdefg',
    },
    space_ids: ['default'],
  },
};

describe('buildUpdatedRecoveredAlert', () => {
  test('should update already recovered alert document with updated flapping values and timestamp only', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildUpdatedRecoveredAlert<{}>({
        alert: existingRecoveredAlert,
        legacyRawAlert: {
          meta: {
            flapping: true,
            flappingHistory: [false, false, true, true],
            maintenanceWindowIds: ['maint-1', 'maint-321'],
          },
          state: {
            start: '3023-03-27T12:27:28.159Z',
          },
        },
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      kibana: {
        alert: {
          action_group: 'recovered',
          duration: {
            us: '0',
          },
          end: '2023-03-28T12:27:28.159Z',
          flapping: true,
          flapping_history: [false, false, true, true],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: ['maint-x'],
          start: '2023-03-27T12:27:28.159Z',
          rule,
          status: 'recovered',
          uuid: 'abcdefg',
        },
        space_ids: ['default'],
      },
    });
  });
});
