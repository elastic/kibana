/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { configSchema } from './config';

describe('config validation', () => {
  test('alerts defaults', () => {
    const config: Record<string, unknown> = {};
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "healthCheck": Object {
          "interval": "60m",
        },
        "invalidateApiKeysTask": Object {
          "interval": "5m",
          "removalDelay": "5m",
        },
      }
    `);
  });
});
