/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiAlert, transformAlert } from './common_transformations';
import { AlertExecutionStatusErrorReasons } from '../../common';

beforeEach(() => jest.resetAllMocks());

const dateFixed = Date.parse('2021-12-15T12:34:56.789Z');
const dateCreated = new Date(dateFixed - 2000);
const dateUpdated = new Date(dateFixed - 1000);
const dateExecuted = new Date(dateFixed);

describe('common_transformations', () => {
  test('transformAlert() with all optional fields', () => {
    const apiAlert: ApiAlert = {
      id: 'some-id',
      name: 'some-name',
      enabled: true,
      tags: ['tag-1', 'tag-2'],
      rule_type_id: 'some-rule-type',
      consumer: 'some-consumer',
      schedule: { interval: '1s' },
      actions: [
        {
          connector_type_id: 'some-connector-type-id',
          group: 'some group',
          id: 'some-connector-id',
          params: { foo: 'car', bar: [1, 2, 3] },
        },
      ],
      params: { bar: 'foo', numbers: { 1: [2, 3] } } as never,
      scheduled_task_id: 'some-task-id',
      created_by: 'created-by-user',
      updated_by: null,
      created_at: dateCreated.toISOString(),
      updated_at: dateUpdated.toISOString(),
      api_key: 'some-api-key',
      api_key_owner: 'api-key-user',
      throttle: '2s',
      notify_when: 'onActiveAlert',
      mute_all: false,
      muted_alert_ids: ['bob', 'jim'],
      execution_status: {
        last_execution_date: dateExecuted.toISOString(),
        last_duration: 42,
        status: 'error',
        error: {
          reason: AlertExecutionStatusErrorReasons.Unknown,
          message: 'this is just a test',
        },
      },
    };
    expect(transformAlert(apiAlert)).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "some-connector-type-id",
            "group": "some group",
            "id": "some-connector-id",
            "params": Object {
              "bar": Array [
                1,
                2,
                3,
              ],
              "foo": "car",
            },
          },
        ],
        "alertTypeId": "some-rule-type",
        "apiKey": "some-api-key",
        "apiKeyOwner": "api-key-user",
        "consumer": "some-consumer",
        "createdAt": 2021-12-15T12:34:54.789Z,
        "createdBy": "created-by-user",
        "enabled": true,
        "executionStatus": Object {
          "error": Object {
            "message": "this is just a test",
            "reason": "unknown",
          },
          "lastDuration": 42,
          "lastExecutionDate": 2021-12-15T12:34:56.789Z,
          "status": "error",
        },
        "id": "some-id",
        "muteAll": false,
        "mutedInstanceIds": Array [
          "bob",
          "jim",
        ],
        "name": "some-name",
        "notifyWhen": "onActiveAlert",
        "params": Object {
          "bar": "foo",
          "numbers": Object {
            "1": Array [
              2,
              3,
            ],
          },
        },
        "schedule": Object {
          "interval": "1s",
        },
        "scheduledTaskId": "some-task-id",
        "tags": Array [
          "tag-1",
          "tag-2",
        ],
        "throttle": "2s",
        "updatedAt": 2021-12-15T12:34:55.789Z,
        "updatedBy": null,
      }
    `);
  });

  test('transformAlert() with no optional fields', () => {
    const apiAlert: ApiAlert = {
      id: 'some-id',
      name: 'some-name',
      enabled: true,
      tags: [],
      rule_type_id: 'some-rule-type',
      consumer: 'some-consumer',
      schedule: { interval: '1s' },
      actions: [
        {
          connector_type_id: 'some-connector-type-id',
          group: 'some group',
          id: 'some-connector-id',
          params: {},
        },
      ],
      params: {} as never,
      created_by: 'created-by-user',
      updated_by: null,
      created_at: dateCreated.toISOString(),
      updated_at: dateUpdated.toISOString(),
      api_key: 'some-api-key',
      api_key_owner: 'api-key-user',
      throttle: '2s',
      notify_when: 'onActiveAlert',
      mute_all: false,
      muted_alert_ids: ['bob', 'jim'],
      execution_status: {
        last_execution_date: dateExecuted.toISOString(),
        status: 'error',
      },
    };
    expect(transformAlert(apiAlert)).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "some-connector-type-id",
            "group": "some group",
            "id": "some-connector-id",
            "params": Object {},
          },
        ],
        "alertTypeId": "some-rule-type",
        "apiKey": "some-api-key",
        "apiKeyOwner": "api-key-user",
        "consumer": "some-consumer",
        "createdAt": 2021-12-15T12:34:54.789Z,
        "createdBy": "created-by-user",
        "enabled": true,
        "executionStatus": Object {
          "lastDuration": undefined,
          "lastExecutionDate": 2021-12-15T12:34:56.789Z,
          "status": "error",
        },
        "id": "some-id",
        "muteAll": false,
        "mutedInstanceIds": Array [
          "bob",
          "jim",
        ],
        "name": "some-name",
        "notifyWhen": "onActiveAlert",
        "params": Object {},
        "schedule": Object {
          "interval": "1s",
        },
        "scheduledTaskId": undefined,
        "tags": Array [],
        "throttle": "2s",
        "updatedAt": 2021-12-15T12:34:55.789Z,
        "updatedBy": null,
      }
    `);
  });
});
