/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseValue } from './parse_value';

describe('parseValue', () => {
  test('parseValue should return null if value null', () => {
    expect(parseValue(null)).toEqual(null);
  });

  test('parseValue should return undefined if value undefined', () => {
    expect(parseValue(undefined)).toEqual(undefined);
  });

  test('parseValue should return a string if value is an object', () => {
    expect(parseValue({ hello: 'world' })).toEqual('{"hello":"world"}');
  });

  test('parseValue should return a number if value is a number', () => {
    expect(parseValue(33)).toEqual(33);
  });

  test('parseValue should return a string if value is a string', () => {
    expect(parseValue('I am a string')).toEqual('I am a string');
  });
});
