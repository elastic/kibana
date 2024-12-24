/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFuncArg } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/types';
import { validateJSON } from './validate_json';

describe('validateJSON', () => {
  const formData = {} as ValidationFuncArg<FormData, unknown>;

  it('does not return an error for valid JSON with less than maxProperties', () => {
    expect(validateJSON({ ...formData, value: JSON.stringify({ foo: 'test' }) })).toBeUndefined();
  });

  it('does not return an error with an empty string value', () => {
    expect(validateJSON({ ...formData, value: '' })).toBeUndefined();
  });

  it('does not return an error with undefined value', () => {
    expect(validateJSON(formData)).toBeUndefined();
  });

  it('does not return an error with a null value', () => {
    expect(validateJSON({ ...formData, value: null })).toBeUndefined();
  });

  it('validates syntax errors correctly', () => {
    expect(validateJSON({ ...formData, value: 'foo' })).toEqual({
      code: 'ERR_JSON_FORMAT',
      message: 'Invalid JSON.',
    });
  });

  it('validates a string with spaces correctly', () => {
    expect(validateJSON({ ...formData, value: '   ' })).toEqual({
      code: 'ERR_JSON_FORMAT',
      message: 'Invalid JSON.',
    });
  });

  it('validates max properties correctly', () => {
    let value = '{"a":"1"';
    for (let i = 0; i < 10; i += 1) {
      value = `${value}, "${i}": "foobar"`;
    }
    value += '}';

    expect(validateJSON({ ...formData, value })).toEqual({
      code: 'ERR_JSON_FORMAT',
      message: 'A maximum of 10 additional fields can be defined at a time.',
    });
  });
});
