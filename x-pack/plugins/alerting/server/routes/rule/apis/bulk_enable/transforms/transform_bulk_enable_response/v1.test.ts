/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformBulkEnableResponse } from './v1';
import { RuleAction, RuleSystemAction } from '../../../../../../../common';

describe('transformBulkEnableResponse', () => {
  const defaultAction: RuleAction = {
    id: '1',
    uuid: '111',
    params: { foo: 'bar' },
    group: 'default',
    actionTypeId: '.test',
    frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' },
    alertsFilter: {
      query: { dsl: '{test:1}', kql: 'test:1s', filters: [] },
      timeframe: {
        days: [1, 2, 3],
        hours: { end: '15:00', start: '00:00' },
        timezone: 'UTC',
      },
    },
  };

  const systemAction: RuleSystemAction = {
    id: '2',
    uuid: '222',
    params: { foo: 'bar' },
    actionTypeId: '.test',
  };

  const rule = {
    id: '3d534c70-582b-11ec-8995-2b1578a3bc5d',
    enabled: true,
    name: 'stressing index-threshold 37/200',
    tags: [],
    alertTypeId: '.index-threshold',
    consumer: 'alerts',
    schedule: {
      interval: '1s',
    },
    actions: [defaultAction],
    systemActions: [systemAction],
    params: {},
    createdBy: 'elastic',
    updatedBy: '2889684073',
    createdAt: new Date('2023-08-01T09:16:35.368Z'),
    updatedAt: new Date('2023-08-01T09:16:35.368Z'),
    notifyWhen: 'onActiveAlert' as const,
    throttle: null,
    apiKey: null,
    apiKeyOwner: '2889684073',
    muteAll: false,
    mutedInstanceIds: [],
    scheduledTaskId: '52125fb0-5895-11ec-ae69-bb65d1a71b72',
    executionStatus: {
      status: 'ok' as const,
      lastExecutionDate: new Date('2023-08-01T09:16:35.368Z'),
      lastDuration: 1194,
    },
    revision: 0,
  };
  it('should transform bulk enable result', () => {
    expect(
      transformBulkEnableResponse({
        rules: [rule],
        errors: [
          {
            message: 'test error',
            status: 400,
            rule: {
              id: 'error-rule-id',
              name: 'error-rule',
            },
          },
        ],

        total: 1,
        taskIdsFailedToBeEnabled: ['error-rule-id'],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          Object {
            "message": "test error",
            "rule": Object {
              "id": "error-rule-id",
              "name": "error-rule",
            },
            "status": 400,
          },
        ],
        "rules": Array [
          Object {
            "actions": Array [
              Object {
                "alerts_filter": Object {
                  "query": Object {
                    "dsl": "{test:1}",
                    "filters": Array [],
                    "kql": "test:1s",
                  },
                  "timeframe": Object {
                    "days": Array [
                      1,
                      2,
                      3,
                    ],
                    "hours": Object {
                      "end": "15:00",
                      "start": "00:00",
                    },
                    "timezone": "UTC",
                  },
                },
                "connector_type_id": ".test",
                "frequency": Object {
                  "notify_when": "onThrottleInterval",
                  "summary": true,
                  "throttle": "1h",
                },
                "group": "default",
                "id": "1",
                "params": Object {
                  "foo": "bar",
                },
                "uuid": "111",
              },
              Object {
                "connector_type_id": ".test",
                "id": "2",
                "params": Object {
                  "foo": "bar",
                },
                "uuid": "222",
              },
            ],
            "api_key_owner": "2889684073",
            "consumer": "alerts",
            "created_at": "2023-08-01T09:16:35.368Z",
            "created_by": "elastic",
            "enabled": true,
            "execution_status": Object {
              "last_duration": 1194,
              "last_execution_date": "2023-08-01T09:16:35.368Z",
              "status": "ok",
            },
            "id": "3d534c70-582b-11ec-8995-2b1578a3bc5d",
            "mute_all": false,
            "muted_alert_ids": Array [],
            "name": "stressing index-threshold 37/200",
            "notify_when": "onActiveAlert",
            "params": Object {},
            "revision": 0,
            "rule_type_id": ".index-threshold",
            "schedule": Object {
              "interval": "1s",
            },
            "scheduled_task_id": "52125fb0-5895-11ec-ae69-bb65d1a71b72",
            "tags": Array [],
            "throttle": null,
            "updated_at": "2023-08-01T09:16:35.368Z",
            "updated_by": "2889684073",
          },
        ],
        "task_ids_failed_to_be_enabled": Array [
          "error-rule-id",
        ],
        "total": 1,
      }
    `);
  });
});
