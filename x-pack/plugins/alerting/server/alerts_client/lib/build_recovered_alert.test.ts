/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../alert/alert';
import { buildRecoveredAlert } from './build_recovered_alert';
import {
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
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
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_SEVERITY_IMPROVING,
} from '@kbn/rule-data-utils';
import {
  alertRule,
  existingFlattenedActiveAlert,
  existingExpandedActiveAlert,
} from './test_fixtures';

for (const flattened of [true, false]) {
  const existingAlert = flattened ? existingFlattenedActiveAlert : existingExpandedActiveAlert;

  describe(`buildRecoveredAlert for ${flattened ? 'flattened' : 'expanded'} existing alert`, () => {
    test('should return alert document with recovered status and info from legacy alert', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default').replaceState({
        start: '2023-03-28T12:27:28.159Z',
        end: '2023-03-30T12:27:28.159Z',
        duration: '36000000',
      });

      expect(
        buildRecoveredAlert<{}, {}, {}, 'default', 'recovered'>({
          // @ts-expect-error
          alert: existingAlert,
          legacyAlert,
          rule: alertRule,
          recoveryActionGroup: 'recovered',
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'close',
        [ALERT_ACTION_GROUP]: 'recovered',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_STATUS]: 'recovered',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_START]: '2023-03-28T12:27:28.159Z',
        [ALERT_END]: '2023-03-30T12:27:28.159Z',
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should return alert document with recovery status and updated rule data if rule definition has changed', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default').replaceState({
        start: '2023-03-28T12:27:28.159Z',
        end: '2023-03-30T12:27:28.159Z',
        duration: '36000000',
      });
      legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

      const updatedRule = {
        ...alertRule,
        [ALERT_RULE_NAME]: 'updated-rule-name',
        [ALERT_RULE_PARAMETERS]: { bar: false },
      };

      expect(
        buildRecoveredAlert<{}, {}, {}, 'default', 'recovered'>({
          // @ts-expect-error
          alert: existingAlert,
          legacyAlert,
          recoveryActionGroup: 'NoLongerActive',
          rule: updatedRule,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...updatedRule,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'close',
        [ALERT_ACTION_GROUP]: 'NoLongerActive',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
        [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-1', 'maint-321'],
        [ALERT_STATUS]: 'recovered',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_START]: '2023-03-28T12:27:28.159Z',
        [ALERT_END]: '2023-03-30T12:27:28.159Z',
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should return alert document with updated payload if specified', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default').replaceState({
        start: '2023-03-28T12:27:28.159Z',
        end: '2023-03-30T12:27:28.159Z',
        duration: '36000000',
      });
      legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

      const alert = flattened
        ? {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            'kibana.alert.nested_field': 3,
          }
        : {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                nested_field: 3,
              },
            },
          };

      expect(
        buildRecoveredAlert<
          { count: number; url: string; 'kibana.alert.nested_field'?: number },
          {},
          {},
          'default',
          'recovered'
        >({
          // @ts-expect-error
          alert,
          legacyAlert,
          recoveryActionGroup: 'NoLongerActive',
          payload: {
            count: 2,
            url: `https://url2`,
            'kibana.alert.nested_field': 2,
          },
          rule: alertRule,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        count: 2,
        url: `https://url2`,
        'kibana.alert.nested_field': 2,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'close',
        [ALERT_ACTION_GROUP]: 'NoLongerActive',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
        [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-1', 'maint-321'],
        [ALERT_STATUS]: 'recovered',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_START]: '2023-03-28T12:27:28.159Z',
        [ALERT_END]: '2023-03-30T12:27:28.159Z',
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should return alert document with updated runTimestamp if specified', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default').replaceState({
        start: '2023-03-28T12:27:28.159Z',
        end: '2023-03-30T12:27:28.159Z',
        duration: '36000000',
      });

      expect(
        buildRecoveredAlert<{}, {}, {}, 'default', 'recovered'>({
          // @ts-expect-error
          alert: existingAlert,
          legacyAlert,
          rule: alertRule,
          runTimestamp: '2030-12-15T02:44:13.124Z',
          recoveryActionGroup: 'recovered',
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2030-12-15T02:44:13.124Z',
        [EVENT_ACTION]: 'close',
        [ALERT_ACTION_GROUP]: 'recovered',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_STATUS]: 'recovered',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_START]: '2023-03-28T12:27:28.159Z',
        [ALERT_END]: '2023-03-30T12:27:28.159Z',
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should merge and de-dupe tags from existing flattened alert, reported recovery payload and rule tags', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default').replaceState({
        start: '2023-03-28T12:27:28.159Z',
        end: '2023-03-30T12:27:28.159Z',
        duration: '36000000',
      });
      legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

      const alert = flattened
        ? {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            tags: ['active-alert-tag', 'rule-'],
            'kibana.alert.nested_field': 3,
          }
        : {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            tags: ['active-alert-tag', 'rule-'],
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                nested_field: 3,
              },
            },
          };

      expect(
        buildRecoveredAlert<
          {
            count: number;
            url: string;
            'kibana.alert.nested_field'?: number;
            tags?: string[];
          },
          {},
          {},
          'default',
          'recovered'
        >({
          // @ts-expect-error
          alert,
          legacyAlert,
          recoveryActionGroup: 'NoLongerActive',
          payload: {
            count: 2,
            url: `https://url2`,
            'kibana.alert.nested_field': 2,
            tags: ['-tags', 'reported-recovery-tag'],
          },
          rule: alertRule,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        count: 2,
        url: `https://url2`,
        'kibana.alert.nested_field': 2,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'close',
        [ALERT_ACTION_GROUP]: 'NoLongerActive',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
        [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-1', 'maint-321'],
        [ALERT_STATUS]: 'recovered',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_START]: '2023-03-28T12:27:28.159Z',
        [ALERT_END]: '2023-03-30T12:27:28.159Z',
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['-tags', 'reported-recovery-tag', 'active-alert-tag', 'rule-'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should update flattened active alert document with updated payload if specified but not overwrite any framework fields', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('default').replaceState({
        start: '2023-03-28T12:27:28.159Z',
        end: '2023-03-30T12:27:28.159Z',
        duration: '36000000',
      });
      legacyAlert.setMaintenanceWindowIds(['maint-1', 'maint-321']);

      const alert = flattened
        ? {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            'kibana.alert.nested_field': 3,
          }
        : {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                nested_field: 3,
              },
            },
          };

      expect(
        buildRecoveredAlert<
          {
            count: number;
            url: string;
            [ALERT_ACTION_GROUP]: string;
            'kibana.alert.nested_field'?: number;
          },
          {},
          {},
          'default',
          'recovered'
        >({
          // @ts-expect-error
          alert,
          legacyAlert,
          recoveryActionGroup: 'NoLongerActive',
          payload: {
            count: 2,
            url: `https://url2`,
            [ALERT_ACTION_GROUP]: 'bad action group',
            'kibana.alert.nested_field': 2,
          },
          rule: alertRule,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
        })
      ).toEqual({
        ...alertRule,
        count: 2,
        url: `https://url2`,
        'kibana.alert.nested_field': 2,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'close',
        [ALERT_ACTION_GROUP]: 'NoLongerActive',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
        [ALERT_MAINTENANCE_WINDOW_IDS]: ['maint-1', 'maint-321'],
        [ALERT_STATUS]: 'recovered',
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_DURATION]: 36000,
        [ALERT_START]: '2023-03-28T12:27:28.159Z',
        [ALERT_END]: '2023-03-30T12:27:28.159Z',
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });

    test('should use workflow_status from payload if specified', () => {
      const legacyAlert = new LegacyAlert<{}, {}, 'error' | 'warning'>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('warning').replaceState({
        start: '2023-03-28T12:27:28.159Z',
        end: '2023-03-30T12:27:28.159Z',
        duration: '36000000',
      });

      const alert = flattened
        ? {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            'kibana.alert.deeply.nested_field': 3,
          }
        : {
            ...existingAlert,
            count: 1,
            url: `https://url1`,
            kibana: {
              // @ts-expect-error
              ...existingAlert.kibana,
              alert: {
                // @ts-expect-error
                ...existingAlert.kibana.alert,
                deeply: { nested_field: 3 },
              },
            },
          };

      expect(
        buildRecoveredAlert<
          {
            count: number;
            url: string;
            [ALERT_WORKFLOW_STATUS]: string;
            'kibana.alert.deeply.nested_field'?: number;
          },
          {},
          {},
          'error' | 'warning',
          'recovered'
        >({
          // @ts-expect-error
          alert,
          legacyAlert,
          rule: alertRule,
          timestamp: '2023-03-29T12:27:28.159Z',
          kibanaVersion: '8.9.0',
          recoveryActionGroup: 'NoLongerActive',
          payload: {
            count: 2,
            url: `https://url2`,
            [ALERT_WORKFLOW_STATUS]: 'custom_status',
            'kibana.alert.deeply.nested_field': 2,
          },
        })
      ).toEqual({
        ...alertRule,
        count: 2,
        url: `https://url2`,
        'kibana.alert.deeply.nested_field': 2,
        [TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [ALERT_RULE_EXECUTION_TIMESTAMP]: '2023-03-29T12:27:28.159Z',
        [EVENT_ACTION]: 'close',
        [ALERT_ACTION_GROUP]: 'NoLongerActive',
        [ALERT_CONSECUTIVE_MATCHES]: 0,
        [ALERT_FLAPPING]: false,
        [ALERT_FLAPPING_HISTORY]: [],
        [ALERT_SEVERITY_IMPROVING]: true,
        [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
        [ALERT_MAINTENANCE_WINDOW_IDS]: [],
        [ALERT_STATUS]: 'recovered',
        [ALERT_WORKFLOW_STATUS]: 'custom_status',
        [ALERT_DURATION]: 36000,
        [ALERT_START]: '2023-03-28T12:27:28.159Z',
        [ALERT_END]: '2023-03-30T12:27:28.159Z',
        [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: '2023-03-30T12:27:28.159Z' },
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.9.0',
        [TAGS]: ['rule-', '-tags'],
        ...(flattened
          ? {
              [EVENT_KIND]: 'signal',
              [ALERT_INSTANCE_ID]: 'alert-A',
              [ALERT_UUID]: 'abcdefg',
            }
          : {
              event: {
                kind: 'signal',
              },
              kibana: {
                alert: {
                  instance: { id: 'alert-A' },
                  uuid: 'abcdefg',
                },
              },
            }),
      });
    });
  });
}
