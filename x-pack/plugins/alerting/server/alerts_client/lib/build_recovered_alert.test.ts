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
  event: {
    action: 'active',
    kind: 'signal',
  },
  kibana: {
    alert: {
      action_group: 'default',
      duration: {
        us: '0',
      },
      flapping: false,
      flapping_history: [true, false],
      instance: {
        id: 'alert-A',
      },
      maintenance_window_ids: ['maint-x'],
      start: '2023-03-28T12:27:28.159Z',
      rule,
      status: 'active',
      time_range: {
        gte: '2023-03-28T12:27:28.159Z',
      },
      uuid: 'abcdefg',
      workflow_status: 'open',
    },
    space_ids: ['default'],
    version: '8.8.1',
  },
  tags: ['rule-', '-tags'],
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
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      event: {
        action: 'close',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'recovered',
          duration: {
            us: '36000000',
          },
          end: '2023-03-30T12:27:28.159Z',
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          start: '2023-03-28T12:27:28.159Z',
          rule,
          status: 'recovered',
          time_range: {
            lte: '2023-03-30T12:27:28.159Z',
            gte: '2023-03-28T12:27:28.159Z',
          },
          uuid: 'abcdefg',
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
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
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      event: {
        action: 'close',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'NoLongerActive',
          duration: {
            us: '36000000',
          },
          end: '2023-03-30T12:27:28.159Z',
          flapping: false,
          flapping_history: [],
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
          time_range: {
            lte: '2023-03-30T12:27:28.159Z',
            gte: '2023-03-28T12:27:28.159Z',
          },
          uuid: 'abcdefg',
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
    });
  });

  test('should update active alert document with updated payload if specified', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert
      .scheduleActions('default')
      .replaceState({ end: '2023-03-30T12:27:28.159Z', duration: '36000000' });
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildRecoveredAlert<
        { count: number; url: string; kibana?: { alert?: { nested_field?: number } } },
        {},
        {},
        'default',
        'recovered'
      >({
        alert: {
          ...existingActiveAlert,
          count: 1,
          url: `https://url1`,
        },
        legacyAlert,
        recoveryActionGroup: 'NoLongerActive',
        payload: {
          count: 2,
          url: `https://url2`,
          kibana: { alert: { nested_field: 2 } },
        },
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
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      count: 2,
      event: {
        action: 'close',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'NoLongerActive',
          duration: {
            us: '36000000',
          },
          end: '2023-03-30T12:27:28.159Z',
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: ['maint-1', 'maint-321'],
          nested_field: 2,
          start: '2023-03-28T12:27:28.159Z',
          rule: {
            ...rule,
            name: 'updated-rule-name',
            parameters: {
              bar: false,
            },
          },
          status: 'recovered',
          time_range: {
            lte: '2023-03-30T12:27:28.159Z',
            gte: '2023-03-28T12:27:28.159Z',
          },
          uuid: 'abcdefg',
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      url: `https://url2`,
      tags: ['rule-', '-tags'],
    });
  });

  test('should merge and de-dupe tags from existing alert, reported recovery payload and rule tags', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert
      .scheduleActions('default')
      .replaceState({ end: '2023-03-30T12:27:28.159Z', duration: '36000000' });
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildRecoveredAlert<
        {
          count: number;
          url: string;
          kibana?: { alert?: { nested_field?: number } };
          tags?: string[];
        },
        {},
        {},
        'default',
        'recovered'
      >({
        alert: {
          ...existingActiveAlert,
          tags: ['active-alert-tag', 'rule-'],
          count: 1,
          url: `https://url1`,
        },
        legacyAlert,
        recoveryActionGroup: 'NoLongerActive',
        payload: {
          count: 2,
          url: `https://url2`,
          kibana: { alert: { nested_field: 2 } },
          tags: ['-tags', 'reported-recovery-tag'],
        },
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
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      count: 2,
      event: {
        action: 'close',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'NoLongerActive',
          duration: {
            us: '36000000',
          },
          end: '2023-03-30T12:27:28.159Z',
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: ['maint-1', 'maint-321'],
          nested_field: 2,
          start: '2023-03-28T12:27:28.159Z',
          rule: {
            ...rule,
            name: 'updated-rule-name',
            parameters: {
              bar: false,
            },
          },
          status: 'recovered',
          time_range: {
            lte: '2023-03-30T12:27:28.159Z',
            gte: '2023-03-28T12:27:28.159Z',
          },
          uuid: 'abcdefg',
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      url: `https://url2`,
      tags: ['-tags', 'reported-recovery-tag', 'active-alert-tag', 'rule-'],
    });
  });

  test('should update active alert document with updated payload if specified but not overwrite any framework fields', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert
      .scheduleActions('default')
      .replaceState({ end: '2023-03-30T12:27:28.159Z', duration: '36000000' });
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildRecoveredAlert<
        {
          count: number;
          url: string;
          kibana?: { alert?: { action_group: string; nested_field?: number } };
        },
        {},
        {},
        'default',
        'recovered'
      >({
        alert: {
          ...existingActiveAlert,
          count: 1,
          url: `https://url1`,
        },
        legacyAlert,
        recoveryActionGroup: 'NoLongerActive',
        payload: {
          count: 2,
          url: `https://url2`,
          kibana: { alert: { action_group: 'bad action group', nested_field: 2 } },
        },
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
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      count: 2,
      event: {
        action: 'close',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'NoLongerActive',
          duration: {
            us: '36000000',
          },
          end: '2023-03-30T12:27:28.159Z',
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: ['maint-1', 'maint-321'],
          nested_field: 2,
          start: '2023-03-28T12:27:28.159Z',
          rule: {
            ...rule,
            name: 'updated-rule-name',
            parameters: {
              bar: false,
            },
          },
          status: 'recovered',
          time_range: {
            lte: '2023-03-30T12:27:28.159Z',
            gte: '2023-03-28T12:27:28.159Z',
          },
          uuid: 'abcdefg',
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      url: `https://url2`,
      tags: ['rule-', '-tags'],
    });
  });
});
