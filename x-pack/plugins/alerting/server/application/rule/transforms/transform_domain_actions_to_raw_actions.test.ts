/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { RuleActionTypes } from '../../../../common';
import { transformDomainActionsToRawActions } from './transform_domain_actions_to_raw_actions';

const defaultAction = {
  id: 'test-default-action',
  group: 'default',
  uuid: '1',
  actionTypeId: '.test',
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
  id: 'my-system-action-id',
  uuid: '123',
  actionTypeId: '.test-system-action',
  params: {},
  type: RuleActionTypes.SYSTEM,
};

const actionsClient = actionsClientMock.create();
actionsClient.isSystemAction.mockImplementation((id) => id === systemAction.id);

const context = {
  getActionsClient: jest.fn().mockResolvedValue(actionsClient),
};

describe('transformDomainActionsToRawActions', () => {
  actionsClient.getBulk.mockResolvedValue([
    {
      id: 'test-default-action',
      actionTypeId: '.test',
      name: 'Default action',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
    },
    {
      id: 'my-system-action-id',
      actionTypeId: '.test-system-action',
      name: 'System action',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: true,
    },
  ]);

  it('transforms the actions correctly', async () => {
    const res = await transformDomainActionsToRawActions({
      actions: [defaultAction, systemAction],
      // @ts-ignore: no need to pass all properties of the context
      context,
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
