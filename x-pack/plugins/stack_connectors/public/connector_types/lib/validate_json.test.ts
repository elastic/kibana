/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateJSON } from './validate_json';

describe('validateJSON', () => {
  it('does not return an error for valid JSON and no maxProperties', () => {
    expect(validateJSON({ value: JSON.stringify({ foo: 'test' }) })).toBeUndefined();
  });

  it('does not return an error for valid JSON and attributes less than maxProperties', () => {
    expect(
      validateJSON({ value: JSON.stringify({ foo: 'test' }), maxProperties: 1 })
    ).toBeUndefined();
  });

  it('does not return an error with empty value and maxProperties=0', () => {
    expect(validateJSON({ maxProperties: 0 })).toBeUndefined();
  });

  it('does not return an error with no values', () => {
    expect(validateJSON({})).toBeUndefined();
  });

  it('does not return an error with empty object and maxProperties=0', () => {
    expect(validateJSON({ value: JSON.stringify({}), maxProperties: 0 })).toBeUndefined();
  });

  it('validates syntax errors correctly', () => {
    expect(validateJSON({ value: 'foo' })).toBe('Invalid JSON.');
  });

  it('validates max properties correctly', () => {
    const value = { foo: 'test', bar: 'test 2' };

    expect(validateJSON({ value: JSON.stringify(value), maxProperties: 1 })).toBe(
      'A maximum of 1 additional fields can be defined at a time.'
    );
  });

  it('does not return an error for an object', () => {
    expect(validateJSON({ value: { foo: 'test' } })).toBeUndefined();
  });
});
