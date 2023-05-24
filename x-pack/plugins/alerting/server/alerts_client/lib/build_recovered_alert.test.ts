/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { buildRecoveredAlert } from './build_recovered_alert';
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
const existingActiveAlert = {
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
      maintenance_window_ids: ['maint-x'],
      start: '2023-03-28T12:27:28.159Z',
      rule,
      status: 'active',
      uuid: 'abcdefg',
    },
    space_ids: ['default'],
  },
};

const existingRecoveredAlert = {
  '@timestamp': '2023-03-28T12:27:28.159Z',
  kibana: {
    alert: {
      action_group: 'default',
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

describe('buildRecoveredAlert', () => {
  test('should update active alert document with recovered status and info from legacy alert', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert
      .scheduleActions('default')
      .replaceState({ end: '2023-03-30T12:27:28.159Z', duration: '36000000' });

    expect(
      buildRecoveredAlert<{}, {}, {}, 'default', 'recovered'>({
        alert: existingActiveAlert,
        legacyAlert,
        rule: alertRule,
        recoveryActionGroup: 'recovered',
        timestamp: '2023-03-29T12:27:28.159Z',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      kibana: {
        alert: {
          action_group: 'recovered',
          duration: {
            us: '36000000',
          },
          end: '2023-03-30T12:27:28.159Z',
          flapping: false,
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          start: '2023-03-28T12:27:28.159Z',
          rule,
          status: 'recovered',
          uuid: 'abcdefg',
        },
        space_ids: ['default'],
      },
    });
  });

  test('should update active alert document with recovery status and updated rule data if rule definition has changed', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert
      .scheduleActions('default')
      .replaceState({ end: '2023-03-30T12:27:28.159Z', duration: '36000000' });
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildRecoveredAlert<{}, {}, {}, 'default', 'recovered'>({
        alert: existingActiveAlert,
        legacyAlert,
        recoveryActionGroup: 'NoLongerActive',
        rule: {
          kibana: {
            alert: {
              rule: {
                ...rule,
                name: 'updated-rule-name',
                parameters: {
                  bar: false,
                },
              },
            },
            space_ids: ['default'],
          },
        },
        timestamp: '2023-03-29T12:27:28.159Z',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      kibana: {
        alert: {
          action_group: 'NoLongerActive',
          duration: {
            us: '36000000',
          },
          end: '2023-03-30T12:27:28.159Z',
          flapping: false,
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: ['maint-1', 'maint-321'],
          start: '2023-03-28T12:27:28.159Z',
          rule: {
            ...rule,
            name: 'updated-rule-name',
            parameters: {
              bar: false,
            },
          },
          status: 'recovered',
          uuid: 'abcdefg',
        },
        space_ids: ['default'],
      },
    });
  });

  test('should update already recovered alert document with updated flapping history but not maintenance window ids', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildRecoveredAlert<{}, {}, {}, 'default', 'recovered'>({
        alert: existingRecoveredAlert,
        legacyAlert,
        rule: alertRule,
        recoveryActionGroup: 'recovered',
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
          flapping: false,
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
