/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { buildNewAlert } from './build_new_alert';
import type { AlertRule } from '../types';

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

describe('buildNewAlert', () => {
  test('should build alert document with info from legacy alert', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<{}, {}, {}, 'default', 'recovered'>({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      kibana: {
        alert: {
          action_group: 'default',
          flapping: false,
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          rule,
          status: 'active',
          uuid: legacyAlert.getUuid(),
        },
        space_ids: ['default'],
      },
    });
  });

  test('should include start and duration if set', () => {
    const now = Date.now();
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default').replaceState({ start: now, duration: '0' });

    expect(
      buildNewAlert<{}, {}, {}, 'default', 'recovered'>({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      kibana: {
        alert: {
          action_group: 'default',
          duration: {
            us: '0',
          },
          flapping: false,
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          start: now,
          rule,
          status: 'active',
          uuid: legacyAlert.getUuid(),
        },
        space_ids: ['default'],
      },
    });
  });

  test('should include flapping history and maintenance window ids if set', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([true, false, false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildNewAlert<{}, {}, {}, 'default', 'recovered'>({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      kibana: {
        alert: {
          action_group: 'default',
          flapping: false,
          flapping_history: [true, false, false, false, true, true],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: ['maint-1', 'maint-321'],
          rule,
          status: 'active',
          uuid: legacyAlert.getUuid(),
        },
        space_ids: ['default'],
      },
    });
  });
});
