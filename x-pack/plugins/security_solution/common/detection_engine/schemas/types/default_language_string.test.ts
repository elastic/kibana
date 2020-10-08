/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultLanguageString } from './default_language_string';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { Language } from '../common/schemas';

describe('default_language_string', () => {
  test('it should validate a string', () => {
    const payload: Language = 'lucene';
    const decoded = DefaultLanguageString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a number', () => {
    const payload = 5;
    const decoded = DefaultLanguageString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultLanguageString"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default of "kuery"', () => {
    const payload = null;
    const decoded = DefaultLanguageString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual('kuery');
  });
});
