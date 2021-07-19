/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../../types';
import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { updateAlert } from './update';
import { AlertNotifyWhenType } from '../../../../../alerting/common';

const http = httpServiceMock.createStartContract();

describe('updateAlert', () => {
  test('should call alert update API', async () => {
    const alertToUpdate = {
      throttle: '1m',
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
      notifyWhen: 'onThrottleInterval' as AlertNotifyWhenType,
    };
    const resolvedValue: Alert = {
      ...alertToUpdate,
      id: '12/3',
      enabled: true,
      alertTypeId: 'test',
      createdBy: null,
      updatedBy: null,
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
    };
    http.put.mockResolvedValueOnce(resolvedValue);

    const result = await updateAlert({ http, id: '12/3', alert: alertToUpdate });
    expect(result).toEqual(resolvedValue);
    expect(http.put.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerting/rule/12%2F3",
        Object {
          "body": "{\\"throttle\\":\\"1m\\",\\"name\\":\\"test\\",\\"tags\\":[\\"foo\\"],\\"schedule\\":{\\"interval\\":\\"1m\\"},\\"params\\":{},\\"notify_when\\":\\"onThrottleInterval\\",\\"actions\\":[]}",
        },
      ]
    `);
  });
});
