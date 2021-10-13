/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertEventLogRecordObject } from './create_alert_event_log_record_object';
import { UntypedNormalizedAlertType } from '../rule_type_registry';
import { RecoveredActionGroup } from '../types';

describe('createAlertEventLogRecordObject', () => {
  const ruleType: jest.Mocked<UntypedNormalizedAlertType> = {
    id: 'test',
    name: 'My test alert',
    actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
    executor: jest.fn(),
    producer: 'alerts',
  };

  test('created alert event "execute-start"', async () => {
    expect(
      createAlertEventLogRecordObject({
        ruleId: '1',
        ruleType,
        action: 'execute-start',
        runDateString: '1970-01-01T00:00:00.000Z',
        task: {
          scheduled: '1970-01-01T00:00:00.000Z',
          scheduleDelay: 0,
        },
        savedObjects: [
          {
            id: '1',
            type: 'alert',
            typeId: ruleType.id,
          },
        ],
      })
    ).toBe({
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute-start',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
      },
      message: 'alert execution start',
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
  });

  test('created alert event "recovered-instance"', async () => {
    expect(
      createAlertEventLogRecordObject({
        ruleId: '1',
        ruleName: 'test name',
        ruleType,
        action: 'recovered-instance',
        instanceId: 'test1',
        group: 'group 1',
        message: 'message text here',
        namespace: 'default',
        subgroup: 'subgroup value',
        state: {
          start: '1970-01-01T00:00:00.000Z',
          end: '1970-01-01T00:05:00.000Z',
          duration: 5,
        },
        savedObjects: [
          {
            id: '1',
            type: 'alert',
            typeId: ruleType.id,
          },
        ],
      })
    ).toBe({
      event: {
        action: 'recovered-instance',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        saved_objects: [
          {
            id: '1',
            namespace: 'default',
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
      },
      message: 'alert execution start',
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
        name: 'test name',
      },
    });
  });

  test('created alert event "execute-action"', async () => {
    expect(
      createAlertEventLogRecordObject({
        ruleId: '1',
        ruleName: 'test name',
        ruleType,
        action: 'recovered-instance',
        instanceId: 'test1',
        group: 'group 1',
        message: 'action execution start',
        namespace: 'default',
        subgroup: 'subgroup value',
        state: {
          start: '1970-01-01T00:00:00.000Z',
          end: '1970-01-01T00:05:00.000Z',
          duration: 5,
        },
        savedObjects: [
          {
            id: '1',
            type: 'alert',
            typeId: ruleType.id,
          },
          {
            id: '2',
            type: 'acion',
            typeId: '.email',
          },
        ],
      })
    ).toBe({
      event: {
        action: 'recovered-instance',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        saved_objects: [
          {
            id: '1',
            namespace: 'default',
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
          {
            id: '2',
            namespace: 'default',
            rel: 'primary',
            type: 'action',
            type_id: '.email',
          },
        ],
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
      },
      message: 'action execution start',
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
        name: 'test name',
      },
    });
  });
});
