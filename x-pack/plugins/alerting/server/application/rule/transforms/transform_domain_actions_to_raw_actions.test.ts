/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionTypes } from '../../../../common';
import { transformDomainActionsToRawActions } from './transform_domain_actions_to_raw_actions';

const defaultAction = {
  group: 'default',
  uuid: '1',
  actionTypeId: '.test',
  actionRef: 'action_0',
  params: {},
  frequency: {
    summary: false,
    notifyWhen: 'onThrottleInterval' as const,
    throttle: '1m',
  },
  alertsFilter: { query: { kql: 'test:1', dsl: '{}', filters: [] } },
  type: RuleActionTypes.DEFAULT,
};

const systemAction = {
  uuid: '123',
  actionTypeId: '.test-system-action',
  actionRef: 'system_action:my-system-action-id',
  params: {},
  type: RuleActionTypes.SYSTEM,
};

describe('transformDomainActionsToRawActions', () => {
  it('transforms the actions correctly', async () => {
    const res = transformDomainActionsToRawActions({
      actions: [defaultAction, systemAction],
    });

    expect(res).toMatchInlineSnapshot(`
      Array [
        Object {
          "actionRef": "action_0",
          "actionTypeId": ".test",
          "alertsFilter": Object {
            "query": Object {
              "dsl": "{}",
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
          "params": Object {},
          "uuid": "1",
        },
        Object {
          "actionRef": "system_action:my-system-action-id",
          "actionTypeId": ".test-system-action",
          "params": Object {},
          "uuid": "123",
        },
      ]
    `);
  });
});
