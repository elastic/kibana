/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('config validation', () => {
  test('alerting defaults', () => {
    const config: Record<string, unknown> = {};
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "cancelAlertsOnRuleTimeout": true,
        "healthCheck": Object {
          "interval": "60m",
        },
        "invalidateApiKeysTask": Object {
          "interval": "5m",
          "removalDelay": "1h",
        },
        "maxEphemeralActionsPerAlert": 10,
        "rules": Object {
          "minimumScheduleInterval": Object {
            "enforce": false,
            "value": "1m",
          },
          "run": Object {
            "actions": Object {
              "max": 100000,
            },
          },
        },
      }
    `);
  });
});
