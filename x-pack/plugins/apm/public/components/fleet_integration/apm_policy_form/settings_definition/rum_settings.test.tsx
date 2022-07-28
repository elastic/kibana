/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getRUMSettings, isRUMFormValid } from './rum_settings';

describe('rum_settings - isRUMFormValid', () => {
  it('returns true when allowed origin is string', () => {
    const settings = getRUMSettings();
    const isValid = isRUMFormValid(
      {
        enable_rum: { value: true, type: 'bool' },
        rum_allow_origins: { value: ['*', 'foo', '1'], type: 'text' },
      },
      settings
    );
    expect(isValid).toBe(true);
  });

  it('returns false when allowed origin is an array', () => {
    const settings = getRUMSettings();
    const isValid = isRUMFormValid(
      {
        enable_rum: { value: true, type: 'bool' },
        rum_allow_origins: {
          value: ['*', 'foo', '1', '["bar"', ']'],
          type: 'text',
        },
      },
      settings
    );
    expect(isValid).toBe(false);
  });

  it('returns true when rum is disabled', () => {
    const settings = getRUMSettings();
    const isValid = isRUMFormValid(
      {
        enable_rum: { value: false, type: 'bool' },
        rum_allow_origins: {
          value: ['*', 'foo', '1', '["bar"]'],
          type: 'text',
        },
      },
      settings
    );
    expect(isValid).toBe(true);
  });
});
