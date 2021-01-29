/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigSchema } from './schema';

describe('Reporting Config Schema', () => {
  it(`context {"dev":false,"dist":false} produces correct config`, () => {
    expect(ConfigSchema.validate({}, { dev: false, dist: false })).toMatchInlineSnapshot(`
      Object {
        "capture": Object {
          "browser": Object {
            "autoDownload": true,
            "chromium": Object {
              "proxy": Object {
                "enabled": false,
              },
            },
            "type": "chromium",
          },
          "loadDelay": "PT3S",
          "maxAttempts": 1,
          "networkPolicy": Object {
            "enabled": true,
            "rules": Array [
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "http:",
              },
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "https:",
              },
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "ws:",
              },
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "wss:",
              },
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "data:",
              },
              Object {
                "allow": false,
                "host": undefined,
                "protocol": undefined,
              },
            ],
          },
          "timeouts": Object {
            "openUrl": "PT1M",
            "renderComplete": "PT30S",
            "waitForElements": "PT30S",
          },
          "viewport": Object {
            "height": 1200,
            "width": 1950,
          },
          "zoom": 2,
        },
        "csv": Object {
          "checkForFormulas": true,
          "enablePanelActionDownload": true,
          "escapeFormulaValues": false,
          "maxSizeBytes": ByteSizeValue {
            "valueInBytes": 10485760,
          },
          "scroll": Object {
            "duration": "30s",
            "size": 500,
          },
          "useByteOrderMarkEncoding": false,
        },
        "enabled": true,
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "index": ".reporting",
        "kibanaServer": Object {},
        "poll": Object {
          "jobCompletionNotifier": Object {
            "interval": 10000,
            "intervalErrorMultiplier": 5,
          },
          "jobsRefresh": Object {
            "interval": 5000,
            "intervalErrorMultiplier": 5,
          },
        },
        "queue": Object {
          "indexInterval": "week",
          "pollEnabled": true,
          "pollInterval": "PT3S",
          "pollIntervalErrorMultiplier": 10,
          "timeout": "PT2M",
        },
        "roles": Object {
          "allow": Array [
            "reporting_user",
          ],
        },
      }
    `);
  });

  it(`context {"dev":false,"dist":true} produces correct config`, () => {
    expect(ConfigSchema.validate({}, { dev: false, dist: true })).toMatchInlineSnapshot(`
      Object {
        "capture": Object {
          "browser": Object {
            "autoDownload": false,
            "chromium": Object {
              "inspect": false,
              "proxy": Object {
                "enabled": false,
              },
            },
            "type": "chromium",
          },
          "loadDelay": "PT3S",
          "maxAttempts": 3,
          "networkPolicy": Object {
            "enabled": true,
            "rules": Array [
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "http:",
              },
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "https:",
              },
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "ws:",
              },
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "wss:",
              },
              Object {
                "allow": true,
                "host": undefined,
                "protocol": "data:",
              },
              Object {
                "allow": false,
                "host": undefined,
                "protocol": undefined,
              },
            ],
          },
          "timeouts": Object {
            "openUrl": "PT1M",
            "renderComplete": "PT30S",
            "waitForElements": "PT30S",
          },
          "viewport": Object {
            "height": 1200,
            "width": 1950,
          },
          "zoom": 2,
        },
        "csv": Object {
          "checkForFormulas": true,
          "enablePanelActionDownload": true,
          "escapeFormulaValues": false,
          "maxSizeBytes": ByteSizeValue {
            "valueInBytes": 10485760,
          },
          "scroll": Object {
            "duration": "30s",
            "size": 500,
          },
          "useByteOrderMarkEncoding": false,
        },
        "enabled": true,
        "index": ".reporting",
        "kibanaServer": Object {},
        "poll": Object {
          "jobCompletionNotifier": Object {
            "interval": 10000,
            "intervalErrorMultiplier": 5,
          },
          "jobsRefresh": Object {
            "interval": 5000,
            "intervalErrorMultiplier": 5,
          },
        },
        "queue": Object {
          "indexInterval": "week",
          "pollEnabled": true,
          "pollInterval": "PT3S",
          "pollIntervalErrorMultiplier": 10,
          "timeout": "PT2M",
        },
        "roles": Object {
          "allow": Array [
            "reporting_user",
          ],
        },
      }
    `);
  });

  it('allows Duration values for certain keys', () => {
    expect(ConfigSchema.validate({ queue: { timeout: '2m' } }).queue.timeout).toMatchInlineSnapshot(
      `"PT2M"`
    );

    expect(
      ConfigSchema.validate({ capture: { loadDelay: '3s' } }).capture.loadDelay
    ).toMatchInlineSnapshot(`"PT3S"`);

    expect(
      ConfigSchema.validate({
        capture: { timeouts: { openUrl: '1m', waitForElements: '30s', renderComplete: '10s' } },
      }).capture.timeouts
    ).toMatchInlineSnapshot(`
      Object {
        "openUrl": "PT1M",
        "renderComplete": "PT10S",
        "waitForElements": "PT30S",
      }
    `);
  });

  it('allows ByteSizeValue values for certain keys', () => {
    expect(ConfigSchema.validate({ csv: { maxSizeBytes: '12mb' } }).csv.maxSizeBytes)
      .toMatchInlineSnapshot(`
      ByteSizeValue {
        "valueInBytes": 12582912,
      }
    `);
  });

  it(`allows optional settings`, () => {
    // encryption key
    expect(
      ConfigSchema.validate({ encryptionKey: 'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq' })
        .encryptionKey
    ).toBe('qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');

    expect(ConfigSchema.validate({ encryptionKey: 'weaksauce' }).encryptionKey).toBe('weaksauce');

    // disableSandbox
    expect(
      ConfigSchema.validate({ capture: { browser: { chromium: { disableSandbox: true } } } })
        .capture.browser.chromium
    ).toMatchObject({ disableSandbox: true, proxy: { enabled: false } });

    // kibanaServer
    expect(
      ConfigSchema.validate({ kibanaServer: { hostname: 'Frodo' } }).kibanaServer
    ).toMatchObject({ hostname: 'Frodo' });
  });

  it('allows setting a wildcard for chrome proxy bypass', () => {
    expect(
      ConfigSchema.validate({
        capture: {
          browser: {
            chromium: {
              proxy: {
                enabled: true,
                server: 'http://example.com:8080',
                bypass: ['*.example.com', '*bar.example.com', 'bats.example.com'],
              },
            },
          },
        },
      }).capture.browser.chromium.proxy
    ).toMatchInlineSnapshot(`
      Object {
        "bypass": Array [
          "*.example.com",
          "*bar.example.com",
          "bats.example.com",
        ],
        "enabled": true,
        "server": "http://example.com:8080",
      }
    `);
  });

  it(`logs the proper validation messages`, () => {
    // kibanaServer
    const throwValidationErr = () => ConfigSchema.validate({ kibanaServer: { hostname: '0' } });
    expect(throwValidationErr).toThrowError(
      `[kibanaServer.hostname]: must not be "0" for the headless browser to correctly resolve the host`
    );
  });
});
