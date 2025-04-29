/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidIndexName } from './es_utils';

describe('Util: isValidIndexName()', () => {
  test('Validation checks.', () => {
    // Lowercase only
    expect(isValidIndexName('lorem')).toBe(true);
    expect(isValidIndexName('loRem')).toBe(false);

    // Cannot include \, /, *, ?, ", <, >, |, space character, comma, #, :
    expect(isValidIndexName('\\')).toBe(false);
    expect(isValidIndexName('/')).toBe(false);
    expect(isValidIndexName('*')).toBe(false);
    expect(isValidIndexName('?')).toBe(false);
    expect(isValidIndexName('"')).toBe(false);
    expect(isValidIndexName('<')).toBe(false);
    expect(isValidIndexName('>')).toBe(false);
    expect(isValidIndexName('|')).toBe(false);
    expect(isValidIndexName(' ')).toBe(false);
    expect(isValidIndexName(',')).toBe(false);
    expect(isValidIndexName('#')).toBe(false);

    // Cannot start with -, _, +
    expect(isValidIndexName('lorem-ipsum')).toBe(true);
    expect(isValidIndexName('lorem_ipsum')).toBe(true);
    expect(isValidIndexName('lorem+ipsum')).toBe(true);
    expect(isValidIndexName('lorem-')).toBe(true);
    expect(isValidIndexName('lorem_')).toBe(true);
    expect(isValidIndexName('lorem+')).toBe(true);
    expect(isValidIndexName('-lorem')).toBe(false);
    expect(isValidIndexName('_lorem')).toBe(false);
    expect(isValidIndexName('+lorem')).toBe(false);

    // Cannot be . or ..
    expect(isValidIndexName('lorem.ipsum')).toBe(true);
    expect(isValidIndexName('lorem.')).toBe(true);
    expect(isValidIndexName('.lorem')).toBe(true);
    expect(isValidIndexName('lorem..ipsum')).toBe(true);
    expect(isValidIndexName('lorem..')).toBe(true);
    expect(isValidIndexName('..lorem')).toBe(true);
    expect(isValidIndexName('.')).toBe(false);
    expect(isValidIndexName('..')).toBe(false);

    // Cannot be longer than 255 bytes (note it is bytes,
    // so multi-byte characters will count towards the 255 limit faster)
    expect(isValidIndexName('a'.repeat(255))).toBe(true);
    expect(isValidIndexName('a'.repeat(256))).toBe(false);
    // multi-byte character test
    expect(isValidIndexName('あ'.repeat(255))).toBe(false);
  });
});
