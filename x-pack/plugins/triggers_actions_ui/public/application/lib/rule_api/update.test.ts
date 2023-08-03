/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '../../../types';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { updateRule } from './update';
import { RuleAction, RuleActionTypes } from '@kbn/alerting-plugin/common';

const http = httpServiceMock.createStartContract();

describe('updateRule', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should call rule update API', async () => {
    const ruleToUpdate = {
      consumer: 'alerts',
      name: 'test',
      tags: ['foo'],
      schedule: {
        interval: '1m',
      },
      params: {},
      actions: [],
      createdAt: new Date('1970-01-01T00:00:00.000Z'),
      updatedAt: new Date('1970-01-01T00:00:00.000Z'),
      apiKey: null,
      apiKeyOwner: null,
      revision: 0,
    };
    const resolvedValue: Rule = {
      ...ruleToUpdate,
      id: '12/3',
      enabled: true,
      ruleTypeId: 'test',
      createdBy: null,
      updatedBy: null,
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      revision: 1,
    };
    http.put.mockResolvedValueOnce(resolvedValue);

    const result = await updateRule({ http, id: '12/3', rule: ruleToUpdate });
    expect(result).toEqual(resolvedValue);
    expect(http.put.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerting/rule/12%2F3",
        Object {
          "body": "{\\"name\\":\\"test\\",\\"tags\\":[\\"foo\\"],\\"schedule\\":{\\"interval\\":\\"1m\\"},\\"params\\":{},\\"actions\\":[]}",
        },
      ]
    `);
  });

  test('should rewrite actions correctly', async () => {
    const ruleToUpdate = {
      name: 'test',
      tags: ['foo'],
      schedule: {
        interval: '1m',
      },
      params: {},
      actions: [
        {
          group: 'threshold met',
          id: '1',
          params: {
            level: 'info',
            message: 'alert ',
          },
          actionTypeId: '.server-log',
          frequency: {
            notifyWhen: 'onActionGroupChange' as const,
            throttle: null,
            summary: false,
          },
        },
        {
          id: 'system-action',
          uuid: '123',
          actionTypeId: '.test',
          params: {},
          type: RuleActionTypes.SYSTEM,
        },
      ] as RuleAction[],
    };

    http.put.mockResolvedValueOnce({});

    await updateRule({ http, id: '12/3', rule: ruleToUpdate });

    expect(http.put.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerting/rule/12%2F3",
        Object {
          "body": "{\\"name\\":\\"test\\",\\"tags\\":[\\"foo\\"],\\"schedule\\":{\\"interval\\":\\"1m\\"},\\"params\\":{},\\"actions\\":[{\\"group\\":\\"threshold met\\",\\"id\\":\\"1\\",\\"params\\":{\\"level\\":\\"info\\",\\"message\\":\\"alert \\"},\\"frequency\\":{\\"notify_when\\":\\"onActionGroupChange\\",\\"throttle\\":null,\\"summary\\":false},\\"connector_type_id\\":\\".server-log\\"},{\\"id\\":\\"system-action\\",\\"uuid\\":\\"123\\",\\"params\\":{},\\"type\\":\\"system\\",\\"connector_type_id\\":\\".test\\"}]}",
        },
      ]
    `);
  });
});
