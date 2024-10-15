/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyValueDescription } from './stringify_value_description';

describe('StringifyValueDescription', () => {
  it('works for a json object', () => {
    expect(stringifyValueDescription({ test: 'test' })).toEqual('{"test":"test"}');
  });
  it('works for an array', () => {
    expect(stringifyValueDescription(['a', 'b'])).toEqual('["a","b"]');
  });
  it('works for a string', () => {
    expect(stringifyValueDescription('test')).toEqual('test');
  });
  it('works for a number', () => {
    expect(stringifyValueDescription(123)).toEqual('123');
  });
  it('empty string for undefined', () => {
    expect(stringifyValueDescription(undefined)).toEqual('');
  });
  it('empty string for null', () => {
    expect(stringifyValueDescription(null)).toEqual('');
  });
});
