/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseTag } from './key_value';

describe('parseTag', () => {
  test('simpleg non-key-value tag key contains the whole tag and value is empty', () => {
    const result = parseTag('Staging');
    expect(result).toEqual({
      key: 'Staging',
      value: '',
    });
  });

  test('parses key-value tag into key and value', () => {
    const result = parseTag('Team:👍 AppArch');
    expect(result).toEqual({
      key: 'Team',
      value: '👍 AppArch',
    });
  });

  test('trims whitespace in a key-value tag', () => {
    const result = parseTag(' Team : Canvas ');
    expect(result).toEqual({
      key: 'Team',
      value: 'Canvas',
    });
  });

  test('key-value tag can have empty value when it has extra whitespace', () => {
    const result = parseTag(' Team :  ');
    expect(result).toEqual({
      key: 'Team',
      value: '',
    });
  });

  test('key-value tag without extra whitespace can have empty value', () => {
    const result = parseTag('Environment:');
    expect(result).toEqual({
      key: 'Environment',
      value: '',
    });
  });

  test('in key-value tag with multiple colons, the first colon is used as key separator', () => {
    const result = parseTag('Environment:Production:123');
    expect(result).toEqual({
      key: 'Environment',
      value: 'Production:123',
    });
  });
});
