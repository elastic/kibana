/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { cloneRule } from './clone';

const http = httpServiceMock.createStartContract();

describe('cloneRule', () => {
  const resolvedValue = {
    id: '12/3',
    params: {
      aggType: 'count',
      termSize: 5,
      thresholdComparator: '>',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      groupBy: 'all',
      threshold: [1000],
      index: ['.kibana'],
      timeField: 'alert.executionStatus.lastExecutionDate',
    },
    consumer: 'alerts',
    schedule: { interval: '1m' },
    tags: [],
    name: 'test',
    rule_type_id: '.index-threshold',
    actions: [
      {
        group: 'threshold met',
        id: '1',
        params: {
          level: 'info',
          message: 'alert ',
        },
        frequency: {
          notifyWhen: 'onActionGroupChange',
          throttle: null,
          summary: false,
        },
        connector_type_id: '.server-log',
      },
    ],
    scheduled_task_id: '1',
    execution_status: { status: 'pending', last_execution_date: '2021-04-01T21:33:13.250Z' },
    create_at: '2021-04-01T21:33:13.247Z',
    updated_at: '2021-04-01T21:33:13.247Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    http.post.mockResolvedValueOnce(resolvedValue);
  });

  test('should call _clone rule API', async () => {
    const result = await cloneRule({ http, ruleId: '12/3' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": ".server-log",
            "frequency": Object {
              "notifyWhen": "onActionGroupChange",
              "summary": false,
              "throttle": null,
            },
            "group": "threshold met",
            "id": "1",
            "params": Object {
              "level": "info",
              "message": "alert ",
            },
          },
        ],
        "activeSnoozes": undefined,
        "apiKeyOwner": undefined,
        "consumer": "alerts",
        "create_at": "2021-04-01T21:33:13.247Z",
        "createdAt": undefined,
        "createdBy": undefined,
        "executionStatus": Object {
          "lastDuration": undefined,
          "lastExecutionDate": "2021-04-01T21:33:13.250Z",
          "status": "pending",
        },
        "id": "12/3",
        "isSnoozedUntil": undefined,
        "muteAll": undefined,
        "mutedInstanceIds": undefined,
        "name": "test",
        "notifyWhen": undefined,
        "params": Object {
          "aggType": "count",
          "groupBy": "all",
          "index": Array [
            ".kibana",
          ],
          "termSize": 5,
          "threshold": Array [
            1000,
          ],
          "thresholdComparator": ">",
          "timeField": "alert.executionStatus.lastExecutionDate",
          "timeWindowSize": 5,
          "timeWindowUnit": "m",
        },
        "ruleTypeId": ".index-threshold",
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "1",
        "snoozeSchedule": undefined,
        "tags": Array [],
        "updatedAt": "2021-04-01T21:33:13.247Z",
        "updatedBy": undefined,
      }
    `);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/internal/alerting/rule/12%2F3/_clone",
        ],
      ]
    `);
  });
});
