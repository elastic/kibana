/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleDomain } from '../types';
import { transformRuleDomainToRuleAttributes } from './transform_rule_domain_to_rule_attributes';

describe('transformRuleDomainToRuleAttributes', () => {
  const MOCK_API_KEY = Buffer.from('123:abc').toString('base64');

  const defaultAction = {
    id: '1',
    uuid: 'test-uuid',
    group: 'default',
    actionTypeId: 'test',
    params: {},
  };

  const rule: RuleDomain<{}> = {
    id: 'test',
    enabled: false,
    name: 'my rule name',
    tags: ['foo'],
    alertTypeId: 'myType',
    consumer: 'myApp',
    schedule: { interval: '1m' },
    actions: [defaultAction],
    params: {},
    mapped_params: {},
    createdBy: 'user',
    createdAt: new Date('2019-02-12T21:01:22.479Z'),
    updatedAt: new Date('2019-02-12T21:01:22.479Z'),
    legacyId: 'legacyId',
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: [],
    scheduledTaskId: 'task-123',
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
      status: 'pending' as const,
    },
    throttle: null,
    notifyWhen: null,
    revision: 0,
    updatedBy: 'user',
    apiKey: MOCK_API_KEY,
    apiKeyOwner: 'user',
    flapping: {
      lookBackWindow: 20,
      statusChangeThreshold: 20,
    },
  };

  test('should transform rule domain to rule attribute', () => {
    const result = transformRuleDomainToRuleAttributes({
      rule,
      actionsWithRefs: [
        {
          group: 'default',
          actionRef: 'action_0',
          actionTypeId: 'test',
          uuid: 'test-uuid',
          params: {},
        },
      ],
      params: {
        legacyId: 'test',
        paramsWithRefs: {},
      },
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {},
            "uuid": "test-uuid",
          },
        ],
        "alertTypeId": "myType",
        "apiKey": "MTIzOmFiYw==",
        "apiKeyOwner": "user",
        "consumer": "myApp",
        "createdAt": "2019-02-12T21:01:22.479Z",
        "createdBy": "user",
        "enabled": false,
        "executionStatus": Object {
          "lastExecutionDate": "2019-02-12T21:01:22.479Z",
          "status": "pending",
        },
        "flapping": Object {
          "lookBackWindow": 20,
          "statusChangeThreshold": 20,
        },
        "legacyId": "test",
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "my rule name",
        "notifyWhen": null,
        "params": Object {},
        "revision": 0,
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "snoozeSchedule": Array [],
        "tags": Array [
          "foo",
        ],
        "throttle": null,
        "updatedAt": "2019-02-12T21:01:22.479Z",
        "updatedBy": "user",
      }
    `);
  });
});
