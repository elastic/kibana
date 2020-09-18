/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultThreatArray } from './default_threat_array';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { Threat } from '../common/schemas';

describe('default_threat_null', () => {
  test('it should validate an empty array', () => {
    const payload: Threat = [];
    const decoded = DefaultThreatArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of threats', () => {
    const payload: Threat = [
      {
        framework: 'MITRE ATTACK',
        technique: [{ reference: 'https://test.com', name: 'Audio Capture', id: 'T1123' }],
        tactic: { reference: 'https://test.com', name: 'Collection', id: 'TA000999' },
      },
    ];
    const decoded = DefaultThreatArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array with a number', () => {
    const payload = [
      {
        framework: 'MITRE ATTACK',
        technique: [{ reference: 'https://test.com', name: 'Audio Capture', id: 'T1123' }],
        tactic: { reference: 'https://test.com', name: 'Collection', id: 'TA000999' },
      },
      5,
    ];
    const decoded = DefaultThreatArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultThreatArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default empty array if not provided a value', () => {
    const payload = null;
    const decoded = DefaultThreatArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
