/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateTagTitle, validateTagDescription, validateTagColor } from './validators';

describe('validateTagTitle()', () => {
  test('succeeds on valid title', () => {
    validateTagTitle('Production Env');
  });

  test('throws if title too short', () => {
    expect(() => validateTagTitle('')).toThrowErrorMatchingInlineSnapshot(
      `"Tag title is too short."`
    );
  });

  test('throws if title is too long', () => {
    const title = 'hello'.repeat(100);
    expect(() => validateTagTitle(title)).toThrowErrorMatchingInlineSnapshot(
      `"Tag title is too long."`
    );
  });
});

describe('validateTagDescription()', () => {
  test('succeeds on valid description', () => {
    validateTagDescription('This is a tag for production environment.');
  });

  test('throws if title is too long', () => {
    const title = 'extremely long description'.repeat(20000);
    expect(() => validateTagDescription(title)).toThrowErrorMatchingInlineSnapshot(
      `"Tag description is too long."`
    );
  });
});

describe('validateTagColor()', () => {
  test('succeeds on valid colors', () => {
    validateTagColor('#000000');
    validateTagColor('#fffFFF');
    validateTagColor('#234983');
  });

  test('allows empty string as color', () => {
    validateTagColor('');
  });

  test('throws if number if provided', () => {
    expect(() => validateTagColor(123 as any)).toThrowErrorMatchingInlineSnapshot(
      `"Expected color to be a string."`
    );
  });

  test('throws if color not preceded with hash', () => {
    expect(() => validateTagColor('faAABb')).toThrowErrorMatchingInlineSnapshot(
      `"Expected color to start with a hash."`
    );
  });

  test('throws on invalid color string length', () => {
    expect(() => validateTagColor('#faAABba')).toThrowErrorMatchingInlineSnapshot(
      `"Expected color to be 6-digit HEX string."`
    );
    expect(() => validateTagColor('#faAAB')).toThrowErrorMatchingInlineSnapshot(
      `"Expected color to be 6-digit HEX string."`
    );
  });

  test('throws on invalid HEX char', () => {
    expect(() => validateTagColor('#faAABz')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid digit in tag color."`
    );
  });
});
