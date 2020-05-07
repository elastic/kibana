/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { configSchema } from './config';

describe('config validation', () => {
  test('action defaults', () => {
    const config: Record<string, unknown> = {};
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "enabledActionTypes": Array [
          "*",
        ],
        "preconfigured": Array [],
        "whitelistedHosts": Array [
          "*",
        ],
      }
    `);
  });

  test('action with preconfigured actions', () => {
    const config: Record<string, unknown> = {
      preconfigured: [
        {
          id: 'my-slack1',
          actionTypeId: '.slack',
          name: 'Slack #xyz',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
          },
        },
      ],
    };
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "enabledActionTypes": Array [
          "*",
        ],
        "preconfigured": Array [
          Object {
            "actionTypeId": ".slack",
            "config": Object {
              "webhookUrl": "https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz",
            },
            "id": "my-slack1",
            "name": "Slack #xyz",
            "secrets": Object {},
          },
        ],
        "whitelistedHosts": Array [
          "*",
        ],
      }
    `);
  });
});
