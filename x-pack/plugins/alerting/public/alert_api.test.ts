/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule, RuleType } from '../common';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadRule, loadRuleType, loadRuleTypes } from './alert_api';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadRuleTypes', () => {
  test('should call get rule types API', async () => {
    http.get.mockResolvedValueOnce([getApiRuleType()]);

    const result = await loadRuleTypes({ http });
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroups": Array [
            Object {
              "id": "default",
              "name": "Threshold met",
            },
          ],
          "actionVariables": Object {
            "context": Array [
              Object {
                "description": "A pre-constructed message for the alert.",
                "name": "message",
              },
            ],
            "params": Array [
              Object {
                "description": "An array of values to use as the threshold; \\"between\\" and \\"notBetween\\" require two values, the others require one.",
                "name": "threshold",
              },
            ],
            "state": Array [
              Object {
                "description": "Example state variable",
                "name": "example",
              },
            ],
          },
          "authorizedConsumers": Object {
            "alerts": Object {
              "all": true,
              "read": true,
            },
          },
          "defaultActionGroupId": "default",
          "enabledInLicense": true,
          "id": ".index-threshold",
          "isExportable": true,
          "minimumLicenseRequired": "basic",
          "name": "Index threshold",
          "producer": "stackAlerts",
          "recoveryActionGroup": Object {
            "id": "recovered",
            "name": "Recovered",
          },
          "ruleTaskTimeout": "5m",
        },
      ]
    `);

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerting/rule_types",
      ]
    `);
  });
});

describe('loadRuleType', () => {
  test('should call get rule types API', async () => {
    const ruleType = getApiRuleType();
    http.get.mockResolvedValueOnce([ruleType]);

    const result = await loadRuleType({ http, id: ruleType.id });
    expect(result).toEqual(getRuleType());
  });
});

describe('loadRule', () => {
  test('should call get API with base parameters', async () => {
    const apiRule = getApiRule();
    http.get.mockResolvedValueOnce(apiRule);

    const res = await loadRule({ http, ruleId: apiRule.id });
    expect(res).toEqual(getRule());

    const fixedDate = new Date('2021-12-11T16:59:50.152Z');
    res.updatedAt = fixedDate;
    res.createdAt = fixedDate;
    res.executionStatus.lastExecutionDate = fixedDate;
    expect(res).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": ".server-log",
            "group": "threshold met",
            "id": "3619a0d0-582b-11ec-8995-2b1578a3bc5d",
            "params": Object {
              "message": "alert 37: {{context.message}}",
            },
          },
        ],
        "alertTypeId": ".index-threshold",
        "apiKey": null,
        "apiKeyOwner": "2889684073",
        "consumer": "alerts",
        "createdAt": 2021-12-11T16:59:50.152Z,
        "createdBy": "elastic",
        "enabled": true,
        "executionStatus": Object {
          "lastDuration": 1194,
          "lastExecutionDate": 2021-12-11T16:59:50.152Z,
          "status": "ok",
        },
        "id": "3d534c70-582b-11ec-8995-2b1578a3bc5d",
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "stressing index-threshold 37/200",
        "notifyWhen": "onActiveAlert",
        "params": Object {
          "x": 42,
        },
        "schedule": Object {
          "interval": "1s",
        },
        "scheduledTaskId": "52125fb0-5895-11ec-ae69-bb65d1a71b72",
        "tags": Array [],
        "throttle": null,
        "updatedAt": 2021-12-11T16:59:50.152Z,
        "updatedBy": "2889684073",
      }
    `);

    expect(http.get).toHaveBeenCalledWith(`/internal/alerting/rule/${apiRule.id}`);
  });
});

function getApiRuleType() {
  return {
    id: '.index-threshold',
    name: 'Index threshold',
    producer: 'stackAlerts',
    enabled_in_license: true,
    recovery_action_group: {
      id: 'recovered',
      name: 'Recovered',
    },
    action_groups: [
      {
        id: 'default',
        name: 'Threshold met',
      },
    ],
    default_action_group_id: 'default',
    minimum_license_required: 'basic',
    is_exportable: true,
    rule_task_timeout: '5m',
    action_variables: {
      context: [
        {
          name: 'message',
          description: 'A pre-constructed message for the alert.',
        },
      ],
      state: [
        {
          name: 'example',
          description: 'Example state variable',
        },
      ],
      params: [
        {
          name: 'threshold',
          description:
            'An array of values to use as the threshold; "between" and "notBetween" require two values, the others require one.',
        },
      ],
    },
    authorized_consumers: {
      alerts: {
        read: true,
        all: true,
      },
    },
  };
}

function getRuleType(): RuleType {
  return {
    id: '.index-threshold',
    name: 'Index threshold',
    producer: 'stackAlerts',
    enabledInLicense: true,
    recoveryActionGroup: {
      id: 'recovered',
      name: 'Recovered',
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Threshold met',
      },
    ],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    ruleTaskTimeout: '5m',
    actionVariables: {
      context: [
        {
          name: 'message',
          description: 'A pre-constructed message for the alert.',
        },
      ],
      state: [
        {
          name: 'example',
          description: 'Example state variable',
        },
      ],
      params: [
        {
          name: 'threshold',
          description:
            'An array of values to use as the threshold; "between" and "notBetween" require two values, the others require one.',
        },
      ],
    },
    authorizedConsumers: {
      alerts: {
        read: true,
        all: true,
      },
    },
  };
}

const DateNow = Date.now();
const RuleCreateDate = new Date(DateNow - 2000);
const RuleUpdateDate = new Date(DateNow - 1000);
const RuleExecuteDate = new Date(DateNow);

function getApiRule() {
  return {
    id: '3d534c70-582b-11ec-8995-2b1578a3bc5d',
    notify_when: 'onActiveAlert',
    rule_type_id: '.index-threshold',
    name: 'stressing index-threshold 37/200',
    consumer: 'alerts',
    tags: [],
    enabled: true,
    throttle: null,
    api_key: null,
    api_key_owner: '2889684073',
    created_by: 'elastic',
    updated_by: '2889684073',
    mute_all: false,
    muted_alert_ids: [],
    schedule: {
      interval: '1s',
    },
    actions: [
      {
        connector_type_id: '.server-log',
        params: {
          message: 'alert 37: {{context.message}}',
        },
        group: 'threshold met',
        id: '3619a0d0-582b-11ec-8995-2b1578a3bc5d',
      },
    ],
    params: { x: 42 },
    updated_at: RuleUpdateDate.toISOString(),
    created_at: RuleCreateDate.toISOString(),
    scheduled_task_id: '52125fb0-5895-11ec-ae69-bb65d1a71b72',
    execution_status: {
      status: 'ok',
      last_execution_date: RuleExecuteDate.toISOString(),
      last_duration: 1194,
    },
  };
}

function getRule(): Rule<{ x: number }> {
  return {
    id: '3d534c70-582b-11ec-8995-2b1578a3bc5d',
    notifyWhen: 'onActiveAlert',
    alertTypeId: '.index-threshold',
    name: 'stressing index-threshold 37/200',
    consumer: 'alerts',
    tags: [],
    enabled: true,
    throttle: null,
    apiKey: null,
    apiKeyOwner: '2889684073',
    createdBy: 'elastic',
    updatedBy: '2889684073',
    muteAll: false,
    mutedInstanceIds: [],
    schedule: {
      interval: '1s',
    },
    actions: [
      {
        actionTypeId: '.server-log',
        params: {
          message: 'alert 37: {{context.message}}',
        },
        group: 'threshold met',
        id: '3619a0d0-582b-11ec-8995-2b1578a3bc5d',
      },
    ],
    params: { x: 42 },
    updatedAt: RuleUpdateDate,
    createdAt: RuleCreateDate,
    scheduledTaskId: '52125fb0-5895-11ec-ae69-bb65d1a71b72',
    executionStatus: {
      status: 'ok',
      lastExecutionDate: RuleExecuteDate,
      lastDuration: 1194,
    },
  };
}
