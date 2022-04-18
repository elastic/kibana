/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema, ActionsConfig, getValidatedConfig } from './config';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('config validation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('action defaults', () => {
    const config: Record<string, unknown> = {};
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "allowedHosts": Array [
          "*",
        ],
        "cleanupFailedExecutionsTask": Object {
          "cleanupInterval": "PT5M",
          "enabled": true,
          "idleInterval": "PT1H",
          "pageSize": 100,
        },
        "enabledActionTypes": Array [
          "*",
        ],
        "maxResponseContentLength": ByteSizeValue {
          "valueInBytes": 1048576,
        },
        "preconfigured": Object {},
        "preconfiguredAlertHistoryEsIndex": false,
        "proxyRejectUnauthorizedCertificates": true,
        "rejectUnauthorized": true,
        "responseTimeout": "PT1M",
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
      proxyRejectUnauthorizedCertificates: false,
      rejectUnauthorized: false,
    };
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "allowedHosts": Array [
          "*",
        ],
        "cleanupFailedExecutionsTask": Object {
          "cleanupInterval": "PT5M",
          "enabled": true,
          "idleInterval": "PT1H",
          "pageSize": 100,
        },
        "enabledActionTypes": Array [
          "*",
        ],
        "maxResponseContentLength": ByteSizeValue {
          "valueInBytes": 1048576,
        },
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
        "preconfiguredAlertHistoryEsIndex": false,
        "proxyRejectUnauthorizedCertificates": false,
        "rejectUnauthorized": false,
        "responseTimeout": "PT1M",
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

  test('validates proxyBypassHosts and proxyOnlyHosts', () => {
    const bypassHosts = ['bypass.elastic.co'];
    const onlyHosts = ['only.elastic.co'];
    let validated: ActionsConfig;

    validated = configSchema.validate({});
    expect(validated.proxyBypassHosts).toEqual(undefined);
    expect(validated.proxyOnlyHosts).toEqual(undefined);

    validated = configSchema.validate({
      proxyBypassHosts: bypassHosts,
    });
    expect(validated.proxyBypassHosts).toEqual(bypassHosts);
    expect(validated.proxyOnlyHosts).toEqual(undefined);

    validated = configSchema.validate({
      proxyOnlyHosts: onlyHosts,
    });
    expect(validated.proxyBypassHosts).toEqual(undefined);
    expect(validated.proxyOnlyHosts).toEqual(onlyHosts);
  });

  test('validates proxyBypassHosts and proxyOnlyHosts used at the same time', () => {
    const bypassHosts = ['bypass.elastic.co'];
    const onlyHosts = ['only.elastic.co'];
    const config: Record<string, unknown> = {
      proxyBypassHosts: bypassHosts,
      proxyOnlyHosts: onlyHosts,
    };

    let validated: ActionsConfig;

    // the config schema validation validates with both set
    validated = configSchema.validate(config);
    expect(validated.proxyBypassHosts).toEqual(bypassHosts);
    expect(validated.proxyOnlyHosts).toEqual(onlyHosts);

    // getValidatedConfig will warn and set onlyHosts to undefined with both set
    validated = getValidatedConfig(mockLogger, validated);
    expect(validated.proxyBypassHosts).toEqual(bypassHosts);
    expect(validated.proxyOnlyHosts).toEqual(undefined);
    expect(mockLogger.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "The confgurations xpack.actions.proxyBypassHosts and xpack.actions.proxyOnlyHosts can not be used at the same time. The configuration xpack.actions.proxyOnlyHosts will be ignored.",
        ],
      ]
    `);
  });

  // Most of the customHostSettings tests are in ./lib/custom_host_settings.test.ts
  // but this one seemed more relevant for this test suite, since url is the one
  // required property.
  test('validates customHostSettings contains a URL', () => {
    const config: Record<string, unknown> = {
      customHostSettings: [{}],
    };

    expect(() => configSchema.validate(config)).toThrowErrorMatchingInlineSnapshot(
      `"[customHostSettings.0.url]: expected value of type [string] but got [undefined]"`
    );
  });

  test('action with ssl configuration', () => {
    const config: Record<string, unknown> = {
      ssl: {
        verificationMode: 'none',
        proxyVerificationMode: 'none',
      },
    };
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "allowedHosts": Array [
          "*",
        ],
        "cleanupFailedExecutionsTask": Object {
          "cleanupInterval": "PT5M",
          "enabled": true,
          "idleInterval": "PT1H",
          "pageSize": 100,
        },
        "enabledActionTypes": Array [
          "*",
        ],
        "maxResponseContentLength": ByteSizeValue {
          "valueInBytes": 1048576,
        },
        "preconfigured": Object {},
        "preconfiguredAlertHistoryEsIndex": false,
        "proxyRejectUnauthorizedCertificates": true,
        "rejectUnauthorized": true,
        "responseTimeout": "PT1M",
        "ssl": Object {
          "proxyVerificationMode": "none",
          "verificationMode": "none",
        },
      }
    `);
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
