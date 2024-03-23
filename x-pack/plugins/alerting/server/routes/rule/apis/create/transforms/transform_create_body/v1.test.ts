/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateRuleAction,
  CreateRuleRequestBodyV1,
} from '../../../../../../../common/routes/rule/apis/create';
import { transformCreateBody } from './v1';

describe('Transform actions V1', () => {
  const defaultAction: CreateRuleAction = {
    actionTypeId: 'test',
    group: 'default',
    id: '2',
    params: {},
    uuid: '123-456',
    use_alert_data_for_template: false,
  };

  const systemAction: CreateRuleAction = {
    actionTypeId: 'test-2',
    id: 'system_action-id',
    params: {},
    uuid: '123-456',
  };

  const rule: CreateRuleRequestBodyV1<{}> = {
    rule_type_id: '1',
    consumer: 'bar',
    name: 'abc',
    schedule: { interval: '10s' },
    tags: ['foo'],
    params: {},
    throttle: '30s',
    actions: [defaultAction, systemAction],
    enabled: true,
    notify_when: 'onActionGroupChange',
  };

  describe('transformCreateBody', () => {
    const isSystemAction = jest.fn().mockImplementation((id) => id === 'system_action-id');

    it('should transform the system actions correctly', async () => {
      expect(transformCreateBody(rule, isSystemAction)).toMatchInlineSnapshot(`
        Object {
          "actions": Array [
            Object {
              "actionTypeId": "test",
              "group": "default",
              "id": "2",
              "params": Object {},
              "useAlertDataForTemplate": false,
              "uuid": "123-456",
            },
          ],
          "alertTypeId": "1",
          "consumer": "bar",
          "enabled": true,
          "name": "abc",
          "notifyWhen": "onActionGroupChange",
          "params": Object {},
          "schedule": Object {
            "interval": "10s",
          },
          "systemActions": Array [
            Object {
              "actionTypeId": "test-2",
              "id": "system_action-id",
              "params": Object {},
              "uuid": "123-456",
            },
          ],
          "tags": Array [
            "foo",
          ],
          "throttle": "30s",
        }
      `);
    });
  });
});
