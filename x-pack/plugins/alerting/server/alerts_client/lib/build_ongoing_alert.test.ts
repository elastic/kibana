/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { buildOngoingAlert } from './build_ongoing_alert';
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
const existingAlert = {
  '@timestamp': '2023-03-28T12:27:28.159Z',
  event: {
    action: 'open',
    kind: 'signal',
  },
  kibana: {
    alert: {
      action_group: 'error',
      duration: {
        us: '0',
      },
      flapping: false,
      flapping_history: [true],
      instance: {
        id: 'alert-A',
      },
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

describe('buildOngoingAlert', () => {
  test('should update alert document with updated info from legacy alert', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A');
    legacyAlert
      .scheduleActions('warning')
      .replaceState({ start: '0000-00-00T00:00:00.000Z', duration: '36000000' });

    expect(
      buildOngoingAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
        alert: existingAlert,
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      event: {
        action: 'active',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'warning',
          duration: {
            us: '36000000',
          },
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
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
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
    });
  });

  test('should update alert document with updated rule data if rule definition has changed', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A');
    legacyAlert
      .scheduleActions('warning')
      .replaceState({ start: '0000-00-00T00:00:00.000Z', duration: '36000000' });

    expect(
      buildOngoingAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
        alert: existingAlert,
        legacyAlert,
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
        action: 'active',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'warning',
          duration: {
            us: '36000000',
          },
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          start: '2023-03-28T12:27:28.159Z',
          rule: {
            ...rule,
            name: 'updated-rule-name',
            parameters: {
              bar: false,
            },
          },
          status: 'active',
          time_range: {
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

  test('should update alert document with updated flapping history and maintenance window ids if set', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('1');
    legacyAlert.scheduleActions('error');
    legacyAlert.setFlappingHistory([false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-xyz']);

    expect(
      buildOngoingAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
        alert: {
          ...existingAlert,
          kibana: {
            ...existingAlert.kibana,
            alert: {
              ...existingAlert.kibana.alert,
              flapping_history: [true, false, false, false, true, true],
              maintenance_window_ids: ['maint-1', 'maint-321'],
            },
          },
        },
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      event: {
        action: 'active',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'error',
          duration: {
            us: '0',
          },
          flapping: false,
          flapping_history: [false, false, true, true],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: ['maint-xyz'],
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
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
    });
  });

  test('should update alert document with updated payload if specified', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A');
    legacyAlert
      .scheduleActions('warning')
      .replaceState({ start: '0000-00-00T00:00:00.000Z', duration: '36000000' });

    expect(
      buildOngoingAlert<
        { count: number; url: string; kibana?: { alert?: { nested_field?: number } } },
        {},
        {},
        'error' | 'warning',
        'recovered'
      >({
        alert: {
          ...existingAlert,
          count: 1,
          url: `https://url1`,
        },
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        payload: {
          count: 2,
          url: `https://url2`,
          kibana: { alert: { nested_field: 2 } },
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      count: 2,
      event: {
        action: 'active',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'warning',
          duration: {
            us: '36000000',
          },
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          nested_field: 2,
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
        version: '8.9.0',
      },
      url: `https://url2`,
      tags: ['rule-', '-tags'],
    });
  });

  test('should update alert document with updated payload is specified but not overwrite any framework fields', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A');
    legacyAlert
      .scheduleActions('warning')
      .replaceState({ start: '0000-00-00T00:00:00.000Z', duration: '36000000' });

    expect(
      buildOngoingAlert<
        {
          count: number;
          url: string;
          kibana?: { alert?: { action_group: string; nested_field?: number } };
        },
        {},
        {},
        'error' | 'warning',
        'recovered'
      >({
        alert: {
          ...existingAlert,
          count: 1,
          url: `https://url1`,
        },
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        payload: {
          count: 2,
          url: `https://url2`,
          kibana: { alert: { action_group: 'bad action group', nested_field: 2 } },
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      count: 2,
      event: {
        action: 'active',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'warning',
          duration: {
            us: '36000000',
          },
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          nested_field: 2,
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
        version: '8.9.0',
      },
      url: `https://url2`,
      tags: ['rule-', '-tags'],
    });
  });

  test('should merge and de-dupe tags from existing alert, reported payload and rule tags', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A');
    legacyAlert
      .scheduleActions('warning')
      .replaceState({ start: '0000-00-00T00:00:00.000Z', duration: '36000000' });

    expect(
      buildOngoingAlert<
        {
          count: number;
          url: string;
          kibana?: { alert?: { action_group: string; nested_field?: number } };
          tags?: string[];
        },
        {},
        {},
        'error' | 'warning',
        'recovered'
      >({
        alert: {
          ...existingAlert,
          count: 1,
          tags: ['old-tag1', '-tags'],
          url: `https://url1`,
        },
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        payload: {
          count: 2,
          url: `https://url2`,
          kibana: { alert: { action_group: 'bad action group', nested_field: 2 } },
          tags: ['-tags', 'custom-tag2'],
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      count: 2,
      event: {
        action: 'active',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'warning',
          duration: {
            us: '36000000',
          },
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          nested_field: 2,
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
        version: '8.9.0',
      },
      url: `https://url2`,
      tags: ['-tags', 'custom-tag2', 'old-tag1', 'rule-'],
    });
  });

  test('should not update alert document if no payload is specified', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A');
    legacyAlert
      .scheduleActions('warning')
      .replaceState({ start: '0000-00-00T00:00:00.000Z', duration: '36000000' });

    expect(
      buildOngoingAlert<{ count: number; url: string }, {}, {}, 'error' | 'warning', 'recovered'>({
        alert: {
          ...existingAlert,
          count: 1,
          url: `https://url1`,
        },
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-29T12:27:28.159Z',
      count: 1,
      event: {
        action: 'active',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'warning',
          duration: {
            us: '36000000',
          },
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
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
        version: '8.9.0',
      },
      url: `https://url1`,
      tags: ['rule-', '-tags'],
    });
  });
});
