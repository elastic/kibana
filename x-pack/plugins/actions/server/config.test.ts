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
        "preconfigured": Object {},
        "whitelistedHosts": Array [
          "*",
        ],
      }
    `);
  });

  test('action with preconfigured actions', () => {
    const config: Record<string, unknown> = {
      preconfigured: {
        mySlack1: {
          actionTypeId: '.slack',
          name: 'Slack #xyz',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
          },
        },
      },
    };
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "enabledActionTypes": Array [
          "*",
        ],
        "preconfigured": Object {
          "mySlack1": Object {
            "actionTypeId": ".slack",
            "config": Object {
              "webhookUrl": "https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz",
            },
            "name": "Slack #xyz",
            "secrets": Object {},
          },
        },
        "whitelistedHosts": Array [
          "*",
        ],
      }
    `);
  });

  test('validates preconfigured action ids', () => {
    expect(() =>
      configSchema.validate(preConfiguredActionConfig(''))
    ).toThrowErrorMatchingInlineSnapshot(
      `"[preconfigured]: invalid preconfigured action id \\"\\""`
    );

    expect(() =>
      configSchema.validate(preConfiguredActionConfig('constructor'))
    ).toThrowErrorMatchingInlineSnapshot(
      `"[preconfigured]: invalid preconfigured action id \\"constructor\\""`
    );

    expect(() =>
      configSchema.validate(preConfiguredActionConfig('__proto__'))
    ).toThrowErrorMatchingInlineSnapshot(
      `"[preconfigured]: invalid preconfigured action id \\"__proto__\\""`
    );
  });
});

// object creator that ensures we can create a property named __proto__ on an
// object, via JSON.parse()
function preConfiguredActionConfig(id: string) {
  return JSON.parse(`{
    "preconfigured": {
        ${JSON.stringify(id)}: {
            "actionTypeId": ".server-log",
            "name": "server log 1"
        },
        "serverLog": {
            "actionTypeId": ".server-log",
            "name": "server log 2"
        }
    }
  }`);
}
