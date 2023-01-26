/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  constants: jest.requireActual('crypto').constants,
}));

jest.mock('@kbn/utils', () => ({
  getLogsPath: () => '/mock/kibana/logs/path',
}));

import { ConfigSchema } from './config';

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(ConfigSchema.validate({})).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "maxSpaces": 1000,
      }
    `);

    expect(ConfigSchema.validate({}, { dev: false })).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "maxSpaces": 1000,
      }
    `);

    expect(ConfigSchema.validate({}, { dev: true })).toMatchInlineSnapshot(`
      Object {
        "enabled": true,
        "maxSpaces": 1000,
      }
    `);
  });

  it('should throw error if spaces is disabled', () => {
    expect(() => ConfigSchema.validate({ enabled: false })).toThrow(
      '[enabled]: Spaces can only be disabled in development mode'
    );

    expect(() => ConfigSchema.validate({ enabled: false }, { dev: false })).toThrow(
      '[enabled]: Spaces can only be disabled in development mode'
    );
  });

  it('should not throw error if spaces is disabled in development mode', () => {
    expect(() => ConfigSchema.validate({ enabled: false }, { dev: true })).not.toThrow();
  });
});
