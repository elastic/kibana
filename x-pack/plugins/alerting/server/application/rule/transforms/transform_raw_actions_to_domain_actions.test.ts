/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionAttributes } from '../../../data/rule/types';
import {
  transformRawActionsToDomainActions,
  transformRawActionsToDomainSystemActions,
} from './transform_raw_actions_to_domain_actions';

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
      references: [{ name: 'default-action-ref', id: 'default-action-id', type: 'action' }],
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
          "uuid": "1",
        },
      ]
    `);
  });
});

describe('transformRawActionsToDomainSystemActions', () => {
  it('transforms the system actions correctly', () => {
    const res = transformRawActionsToDomainSystemActions({
      actions: [defaultAction, systemAction],
      ruleId: 'test-rule',
      references: [{ name: 'default-action-ref', id: 'default-action-id', type: 'action' }],
      isSystemAction,
    });

    expect(res).toMatchInlineSnapshot(`
      Array [
        Object {
          "actionTypeId": ".test-system-action",
          "id": "my-system-action-id",
          "params": Object {},
          "uuid": "123",
        },
      ]
    `);
  });
});
