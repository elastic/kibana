/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigSchema } from './schema';

describe('ConfigSchema', () => {
  it(`should produce correct config for context {"dev": false,"dist": false}`, () => {
    expect(ConfigSchema.validate({}, { dev: false, dist: false })).toMatchInlineSnapshot(`
      Object {
        "browser": Object {
          "autoDownload": true,
          "chromium": Object {
            "proxy": Object {
              "enabled": false,
            },
          },
        },
        "capture": Object {
          "loadDelay": "PT3S",
          "timeouts": Object {
            "openUrl": "PT1M",
            "renderComplete": "PT30S",
            "waitForElements": "PT30S",
          },
          "zoom": 2,
        },
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
        "poolSize": 1,
      }
    `);
  });

  it(`should produce correct config for context {"dev": false,"dist": true}`, () => {
    expect(ConfigSchema.validate({}, { dev: false, dist: true })).toMatchInlineSnapshot(`
      Object {
        "browser": Object {
          "autoDownload": false,
          "chromium": Object {
            "inspect": false,
            "proxy": Object {
              "enabled": false,
            },
          },
        },
        "capture": Object {
          "loadDelay": "PT3S",
          "timeouts": Object {
            "openUrl": "PT1M",
            "renderComplete": "PT30S",
            "waitForElements": "PT30S",
          },
          "zoom": 2,
        },
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
        "poolSize": 1,
      }
    `);
  });

  it(`should allow optional settings`, () => {
    const config = ConfigSchema.validate({ browser: { chromium: { disableSandbox: true } } });

    expect(config).toHaveProperty('browser.chromium', {
      disableSandbox: true,
      proxy: { enabled: false },
    });
  });

  it('should allow setting a wildcard for chrome proxy bypass', () => {
    expect(
      ConfigSchema.validate({
        browser: {
          chromium: {
            proxy: {
              enabled: true,
              server: 'http://example.com:8080',
              bypass: ['*.example.com', '*bar.example.com', 'bats.example.com'],
            },
          },
        },
      }).browser.chromium.proxy
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

  it('allows Duration values for certain keys', () => {
    expect(
      ConfigSchema.validate({ capture: { loadDelay: '3s' } }).capture.loadDelay
    ).toMatchInlineSnapshot(`"PT3S"`);

    expect(
      ConfigSchema.validate({
        capture: {
          timeouts: {
            openUrl: '1m',
            waitForElements: '30s',
            renderComplete: '10s',
          },
        },
      }).capture.timeouts
    ).toMatchInlineSnapshot(`
      Object {
        "openUrl": "PT1M",
        "renderComplete": "PT10S",
        "waitForElements": "PT30S",
      }
    `);
  });
});
