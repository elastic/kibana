/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { buildOngoingAlert } from './build_ongoing_alert';
import type { AlertRule } from '../types';
import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  TAGS,
  TIMESTAMP,
  VERSION,
  ALERT_TIME_RANGE,
} from '@kbn/rule-data-utils';

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
  [ALERT_RULE_CATEGORY]: rule.category,
  [ALERT_RULE_CONSUMER]: rule.consumer,
  [ALERT_RULE_EXECUTION_UUID]: rule.execution.uuid,
  [ALERT_RULE_NAME]: rule.name,
  [ALERT_RULE_PARAMETERS]: rule.parameters,
  [ALERT_RULE_PRODUCER]: rule.producer,
  [ALERT_RULE_REVISION]: rule.revision,
  [ALERT_RULE_TYPE_ID]: rule.rule_type_id,
  [ALERT_RULE_TAGS]: rule.tags,
  [ALERT_RULE_UUID]: rule.uuid,
  [SPACE_IDS]: ['default'],
};

const existingAlert = {
  ...alertRule,
  [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
  [EVENT_ACTION]: 'open',
  [EVENT_KIND]: 'signal',
  [ALERT_ACTION_GROUP]: 'error',
  [ALERT_DURATION]: '0',
  [ALERT_FLAPPING]: false,
  [ALERT_FLAPPING_HISTORY]: [true],
  [ALERT_INSTANCE_ID]: 'alert-A',
  [ALERT_MAINTENANCE_WINDOW_IDS]: [],
  [ALERT_STATUS]: 'active',
  [ALERT_START]: '2023-03-28T12:27:28.159Z',
  [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
  [ALERT_UUID]: 'abcdefg',
  [ALERT_WORKFLOW_STATUS]: 'open',
  [SPACE_IDS]: ['default'],
  [VERSION]: '8.8.1',
  [TAGS]: ['rule-', '-tags'],
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
      ...alertRule,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'active',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'warning',
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  test('should update alert document with updated rule data if rule definition has changed', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A');
    legacyAlert
      .scheduleActions('warning')
      .replaceState({ start: '0000-00-00T00:00:00.000Z', duration: '36000000' });

    const updatedRule = {
      ...alertRule,
      [ALERT_RULE_NAME]: 'updated-rule-name',
      [ALERT_RULE_PARAMETERS]: { bar: false },
    };
    expect(
      buildOngoingAlert<{}, {}, {}, 'error' | 'warning', 'recovered'>({
        alert: existingAlert,
        legacyAlert,
        rule: updatedRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...updatedRule,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'active',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'warning',
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
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
          [ALERT_FLAPPING_HISTORY]: [true, false, false, false, true, true],
          [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-1', 'maint-321'],
        },
        legacyAlert,
        rule: alertRule,
        timestamp: '2023-03-29T12:27:28.159Z',
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'active',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'error',
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [false, false, true, true],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-xyz'],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [ALERT_DURATION]: '0',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });

  test('should update alert document with updated payload if specified', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A');
    legacyAlert
      .scheduleActions('warning')
      .replaceState({ start: '0000-00-00T00:00:00.000Z', duration: '36000000' });

    expect(
      buildOngoingAlert<
        { count: number; url: string; 'kibana.alert.nested_field'?: number },
        {},
        {},
        'error' | 'warning',
        'recovered'
      >({
        // @ts-
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
          'kibana.alert.nested_field': 2,
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      count: 2,
      url: `https://url2`,
      'kibana.alert.nested_field': 2,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'active',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'warning',
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
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
          [ALERT_ACTION_GROUP]: string;
          'kibana.alert.nested_field'?: number;
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
          [ALERT_ACTION_GROUP]: 'bad action group',
          'kibana.alert.nested_field': 2,
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      count: 2,
      url: `https://url2`,
      'kibana.alert.nested_field': 2,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'active',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'warning',
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
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
          [ALERT_ACTION_GROUP]: string;
          'kibana.alert.nested_field'?: number;
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
          [ALERT_ACTION_GROUP]: 'bad action group',
          'kibana.alert.nested_field': 2,
          tags: ['-tags', 'custom-tag2'],
        },
        kibanaVersion: '8.9.0',
      })
    ).toEqual({
      ...alertRule,
      count: 2,
      url: `https://url2`,
      'kibana.alert.nested_field': 2,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'active',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'warning',
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['-tags', 'custom-tag2', 'old-tag1', 'rule-'],
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
      ...alertRule,
      count: 1,
      url: `https://url1`,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'active',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'warning',
      [ALERT_FLAPPING]: false,
      [ALERT_FLAPPING_HISTORY]: [],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: [],
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.9.0',
      [TAGS]: ['rule-', '-tags'],
    });
  });
});
