/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { buildNewAlert } from './build_new_alert';
import type { AlertRule } from '../types';
import { Alert } from '@kbn/alerts-as-data-utils';

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
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      event: {
        action: 'open',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'default',
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          rule,
          status: 'active',
          uuid: legacyAlert.getUuid(),
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
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
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      event: {
        action: 'open',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'default',
          duration: {
            us: '0',
          },
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          start: now,
          rule,
          status: 'active',
          time_range: {
            gte: now,
          },
          uuid: legacyAlert.getUuid(),
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
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
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      event: {
        action: 'open',
        kind: 'signal',
      },
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
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
    });
  });

  test('should include alert payload if specified', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<
        { count: number; url: string; kibana: { alert: { nested_field: number } } },
        {},
        {},
        'default',
        'recovered'
      >({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        payload: { count: 1, url: `https://url1`, kibana: { alert: { nested_field: 2 } } },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      count: 1,
      event: {
        action: 'open',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'default',
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          nested_field: 2,
          rule,
          status: 'active',
          uuid: legacyAlert.getUuid(),
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
      url: `https://url1`,
    });
  });

  test('should use workflow status from alert payload if set', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<
        Alert & { count: number; url: string; kibana: { alert: { nested_field: number } } },
        {},
        {},
        'default',
        'recovered'
      >({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        payload: {
          count: 1,
          url: `https://url1`,
          kibana: { alert: { nested_field: 2, workflow_status: 'custom_workflow' } },
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      count: 1,
      event: {
        action: 'open',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'default',
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          nested_field: 2,
          rule,
          status: 'active',
          uuid: legacyAlert.getUuid(),
          workflow_status: 'custom_workflow',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
      url: `https://url1`,
    });
  });

  test('should overwrite any framework fields included in payload', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<
        {
          count: number;
          url: string;
          kibana: { alert: { action_group: string; nested_field: number } };
        },
        {},
        {},
        'default',
        'recovered'
      >({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        payload: {
          count: 1,
          url: `https://url1`,
          kibana: { alert: { action_group: 'bad action group', nested_field: 2 } },
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      count: 1,
      event: {
        action: 'open',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'default',
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          nested_field: 2,
          rule,
          status: 'active',
          uuid: legacyAlert.getUuid(),
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['rule-', '-tags'],
      url: `https://url1`,
    });
  });

  test('should merge and de-dupe rule tags and any tags from payload', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    expect(
      buildNewAlert<
        {
          count: number;
          url: string;
          kibana: { alert: { action_group: string; nested_field: number } };
          tags: string[];
        },
        {},
        {},
        'default',
        'recovered'
      >({
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-28T12:27:28.159Z',
        payload: {
          count: 1,
          url: `https://url1`,
          kibana: { alert: { action_group: 'bad action group', nested_field: 2 } },
          tags: ['custom-tag1', '-tags'],
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      '@timestamp': '2023-03-28T12:27:28.159Z',
      count: 1,
      event: {
        action: 'open',
        kind: 'signal',
      },
      kibana: {
        alert: {
          action_group: 'default',
          flapping: false,
          flapping_history: [],
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: [],
          nested_field: 2,
          rule,
          status: 'active',
          uuid: legacyAlert.getUuid(),
          workflow_status: 'open',
        },
        space_ids: ['default'],
        version: '8.9.0',
      },
      tags: ['custom-tag1', '-tags', 'rule-'],
      url: `https://url1`,
    });
  });
});
