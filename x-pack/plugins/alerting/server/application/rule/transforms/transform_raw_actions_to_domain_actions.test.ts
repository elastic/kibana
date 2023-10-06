/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionAttributes } from '../../../data/rule/types';
import { transformRawActionsToDomainActions } from './transform_raw_actions_to_domain_actions';

const defaultAction: RuleActionAttributes = {
  group: 'default',
  uuid: '1',
  actionRef: 'default-action-ref',
  actionTypeId: '.test',
  params: {},
  frequency: {
    summary: false,
    notifyWhen: 'onThrottleInterval',
    throttle: '1m',
  },
  alertsFilter: { query: { kql: 'test:1', dsl: '{}', filters: [] } },
};

const systemAction: RuleActionAttributes = {
  actionRef: 'system_action:my-system-action-id',
  uuid: '123',
  actionTypeId: '.test-system-action',
  params: {},
};

const isSystemAction = (id: string) => id === 'my-system-action-id';

describe('transformRawActionsToDomainActions', () => {
  it('transforms the actions correctly', () => {
    const res = transformRawActionsToDomainActions({
      actions: [defaultAction, systemAction],
      ruleId: 'test-rule',
      references: [
        { name: 'system_action:my-system-action-id', id: 'my-system-action-id', type: 'action' },
        { name: 'default-action-ref', id: 'default-action-id', type: 'action' },
      ],
      isSystemAction,
    });

    expect(res).toMatchInlineSnapshot(`
      Array [
        Object {
          "actionTypeId": ".test",
          "alertsFilter": Object {
            "query": Object {
              "filters": Array [],
              "kql": "test:1",
            },
          },
          "frequency": Object {
            "notifyWhen": "onThrottleInterval",
            "summary": false,
            "throttle": "1m",
          },
          "group": "default",
          "id": "default-action-id",
          "params": Object {},
          "type": "default",
          "uuid": "1",
        },
        Object {
          "actionTypeId": ".test-system-action",
          "id": "my-system-action-id",
          "params": Object {},
          "type": "system",
          "uuid": "123",
        },
      ]
    `);
  });
});
