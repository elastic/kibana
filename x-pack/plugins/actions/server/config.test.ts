/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { configSchema } from './config';

describe('config validation', () => {
  test('action defaults', () => {
    const config: Record<string, any> = {};
    expect(configSchema.validate(config)).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "enabledActionTypes": Array [
          "*",
        ],
        "whitelistedHosts": Array [
          "*",
        ],
      }
    `);
  });
});
