/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { buildUpdatedRecoveredAlert } from './build_updated_recovered_alert';
import {
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
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_PREVIOUS_ACTION_GROUP,
} from '@kbn/rule-data-utils';
import {
  alertRule,
  existingFlattenedRecoveredAlert,
  existingExpandedRecoveredAlert,
} from './test_fixtures';

describe('buildUpdatedRecoveredAlert', () => {
  test('should update already recovered flattened alert document with updated flapping values and timestamp only', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildUpdatedRecoveredAlert<{}>({
        alert: existingFlattenedRecoveredAlert,
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
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [EVENT_ACTION]: 'close',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'recovered',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-27T12:27:28.159Z',
      [ALERT_END]: '2023-03-30T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-27T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
      [ALERT_FLAPPING]: true,
      [ALERT_FLAPPING_HISTORY]: [false, false, true, true],
      [ALERT_PREVIOUS_ACTION_GROUP]: 'recovered',
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-x'],
      [ALERT_STATUS]: 'recovered',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.8.1',
      [TAGS]: ['rule-', '-tags'],
      [ALERT_CONSECUTIVE_MATCHES]: 0,
    });
  });

  test('should update with runTimestamp if specified', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildUpdatedRecoveredAlert<{}>({
        alert: existingFlattenedRecoveredAlert,
        runTimestamp: '2030-12-15T02:44:13.124Z',
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
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2030-12-15T02:44:13.124Z',
      [EVENT_ACTION]: 'close',
      [EVENT_KIND]: 'signal',
      [ALERT_ACTION_GROUP]: 'recovered',
      [ALERT_DURATION]: '36000000',
      [ALERT_START]: '2023-03-27T12:27:28.159Z',
      [ALERT_END]: '2023-03-30T12:27:28.159Z',
      [ALERT_TIME_RANGE]: { gte: '2023-03-27T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
      [ALERT_FLAPPING]: true,
      [ALERT_FLAPPING_HISTORY]: [false, false, true, true],
      [ALERT_PREVIOUS_ACTION_GROUP]: 'recovered',
      [ALERT_INSTANCE_ID]: 'alert-A',
      [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-x'],
      [ALERT_STATUS]: 'recovered',
      [ALERT_START]: '2023-03-28T12:27:28.159Z',
      [ALERT_UUID]: 'abcdefg',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [VERSION]: '8.8.1',
      [TAGS]: ['rule-', '-tags'],
      [ALERT_CONSECUTIVE_MATCHES]: 0,
    });
  });

  test('should update already recovered expanded alert document with updated flapping values and timestamp only', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');
    legacyAlert.setFlappingHistory([false, false, true, true]);
    legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

    expect(
      buildUpdatedRecoveredAlert<{}>({
        // @ts-expect-error
        alert: existingExpandedRecoveredAlert,
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
          instance: {
            id: 'alert-A',
          },
          maintenance_window_ids: ['maint-x'],
          start: '2023-03-28T12:27:28.159Z',
          time_range: {
            gte: '2023-03-27T12:27:28.159Z',
            lte: '2023-03-30T12:27:28.159Z',
          },
          uuid: 'abcdefg',
          consecutive_matches: 0,
        },
        version: '8.8.1',
      },
      [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
      [ALERT_FLAPPING]: true,
      [ALERT_FLAPPING_HISTORY]: [false, false, true, true],
      [ALERT_PREVIOUS_ACTION_GROUP]: 'recovered',
      [ALERT_STATUS]: 'recovered',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [SPACE_IDS]: ['default'],
      [TAGS]: ['rule-', '-tags'],
    });
  });
});
