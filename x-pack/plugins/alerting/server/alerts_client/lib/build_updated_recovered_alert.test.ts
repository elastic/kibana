/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { AlertRule } from '../types';
import { buildUpdatedRecoveredAlert } from './build_updated_recovered_alert';
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
  ALERT_END,
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

const existingRecoveredAlert = {
  ...alertRule,
  [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
  [EVENT_ACTION]: 'close',
  [EVENT_KIND]: 'signal',
  [ALERT_ACTION_GROUP]: 'recovered',
  [ALERT_DURATION]: '36000000',
  [ALERT_START]: '2023-03-27T12:27:28.159Z',
  [ALERT_END]: '2023-03-30T12:27:28.159Z',
  [ALERT_TIME_RANGE]: { gte: '2023-03-27T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
  [ALERT_FLAPPING]: false,
  [ALERT_FLAPPING_HISTORY]: [true, false, false],
  [ALERT_INSTANCE_ID]: 'alert-A',
  [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-x'],
  [ALERT_STATUS]: 'recovered',
  [ALERT_START]: '2023-03-28T12:27:28.159Z',
  [ALERT_UUID]: 'abcdefg',
  [ALERT_WORKFLOW_STATUS]: 'open',
  [SPACE_IDS]: ['default'],
  [VERSION]: '8.8.1',
  [TAGS]: ['rule-', '-tags'],
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
      ...alertRule,
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'close',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'recovered',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-27T12:27:28.159Z',
      [ALERT_END]: '2023-03-30T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-27T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
      [ALERT_FLAPPING]: true,
      [ALERT_FLAPPING_HISTORY]: [false, false, true, true],
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-x'],
      [ALERT_STATUS]: 'recovered',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.8.1',
      [TAGS]: ['rule-', '-tags'],
    });
  });
});
