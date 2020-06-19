/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { formatErrors } from './format_errors';

describe('utils', () => {
  test('returns an empty error message string if there are no errors', () => {
    const errors: t.Errors = [];
    const output = formatErrors(errors);
    expect(output).toEqual([]);
  });

  test('returns a single error message if given one', () => {
    const validationError: t.ValidationError = {
      value: 'Some existing error',
      context: [],
      message: 'some error',
    };
    const errors: t.Errors = [validationError];
    const output = formatErrors(errors);
    expect(output).toEqual(['some error']);
  });

  test('returns a two error messages if given two', () => {
    const validationError1: t.ValidationError = {
      value: 'Some existing error 1',
      context: [],
      message: 'some error 1',
    };
    const validationError2: t.ValidationError = {
      value: 'Some existing error 2',
      context: [],
      message: 'some error 2',
    };
    const errors: t.Errors = [validationError1, validationError2];
    const output = formatErrors(errors);
    expect(output).toEqual(['some error 1', 'some error 2']);
  });

  test('will use message before context if it is set', () => {
    const context: t.Context = ([{ key: 'some string key' }] as unknown) as t.Context;
    const validationError1: t.ValidationError = {
      value: 'Some existing error 1',
      context,
      message: 'I should be used first',
    };
    const errors: t.Errors = [validationError1];
    const output = formatErrors(errors);
    expect(output).toEqual(['I should be used first']);
  });

  test('will use context entry of a single string', () => {
    const context: t.Context = ([{ key: 'some string key' }] as unknown) as t.Context;
    const validationError1: t.ValidationError = {
      value: 'Some existing error 1',
      context,
    };
    const errors: t.Errors = [validationError1];
    const output = formatErrors(errors);
    expect(output).toEqual(['Invalid value "Some existing error 1" supplied to "some string key"']);
  });

  test('will use two context entries of two strings', () => {
    const context: t.Context = ([
      { key: 'some string key 1' },
      { key: 'some string key 2' },
    ] as unknown) as t.Context;
    const validationError1: t.ValidationError = {
      value: 'Some existing error 1',
      context,
    };
    const errors: t.Errors = [validationError1];
    const output = formatErrors(errors);
    expect(output).toEqual([
      'Invalid value "Some existing error 1" supplied to "some string key 1,some string key 2"',
    ]);
  });

  test('will filter out and not use any strings of numbers', () => {
    const context: t.Context = ([
      { key: '5' },
      { key: 'some string key 2' },
    ] as unknown) as t.Context;
    const validationError1: t.ValidationError = {
      value: 'Some existing error 1',
      context,
    };
    const errors: t.Errors = [validationError1];
    const output = formatErrors(errors);
    expect(output).toEqual([
      'Invalid value "Some existing error 1" supplied to "some string key 2"',
    ]);
  });

  test('will filter out and not use null', () => {
    const context: t.Context = ([
      { key: null },
      { key: 'some string key 2' },
    ] as unknown) as t.Context;
    const validationError1: t.ValidationError = {
      value: 'Some existing error 1',
      context,
    };
    const errors: t.Errors = [validationError1];
    const output = formatErrors(errors);
    expect(output).toEqual([
      'Invalid value "Some existing error 1" supplied to "some string key 2"',
    ]);
  });

  test('will filter out and not use empty strings', () => {
    const context: t.Context = ([
      { key: '' },
      { key: 'some string key 2' },
    ] as unknown) as t.Context;
    const validationError1: t.ValidationError = {
      value: 'Some existing error 1',
      context,
    };
    const errors: t.Errors = [validationError1];
    const output = formatErrors(errors);
    expect(output).toEqual([
      'Invalid value "Some existing error 1" supplied to "some string key 2"',
    ]);
  });

  test('will use a name context if it cannot find a keyContext', () => {
    const context: t.Context = ([
      { key: '' },
      { key: '', type: { name: 'someName' } },
    ] as unknown) as t.Context;
    const validationError1: t.ValidationError = {
      value: 'Some existing error 1',
      context,
    };
    const errors: t.Errors = [validationError1];
    const output = formatErrors(errors);
    expect(output).toEqual(['Invalid value "Some existing error 1" supplied to "someName"']);
  });

  test('will return an empty string if name does not exist but type does', () => {
    const context: t.Context = ([{ key: '' }, { key: '', type: {} }] as unknown) as t.Context;
    const validationError1: t.ValidationError = {
      value: 'Some existing error 1',
      context,
    };
    const errors: t.Errors = [validationError1];
    const output = formatErrors(errors);
    expect(output).toEqual(['Invalid value "Some existing error 1" supplied to ""']);
  });

  test('will stringify an error value', () => {
    const context: t.Context = ([
      { key: '' },
      { key: 'some string key 2' },
    ] as unknown) as t.Context;
    const validationError1: t.ValidationError = {
      value: { foo: 'some error' },
      context,
    };
    const errors: t.Errors = [validationError1];
    const output = formatErrors(errors);
    expect(output).toEqual([
      'Invalid value "{"foo":"some error"}" supplied to "some string key 2"',
    ]);
  });
});
