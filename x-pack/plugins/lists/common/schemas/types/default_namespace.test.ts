/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { DefaultNamespace } from './default_namespace';

describe('default_namespace', () => {
  test('it should validate "single"', () => {
    const payload = 'single';
    const decoded = DefaultNamespace.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate "agnostic"', () => {
    const payload = 'agnostic';
    const decoded = DefaultNamespace.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it defaults to "single" if "undefined"', () => {
    const payload = undefined;
    const decoded = DefaultNamespace.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual('single');
  });

  test('it defaults to "single" if "null"', () => {
    const payload = null;
    const decoded = DefaultNamespace.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual('single');
  });

  test('it should NOT validate if not "single" or "agnostic"', () => {
    const payload = 'something else';
    const decoded = DefaultNamespace.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      `Invalid value "something else" supplied to "DefaultNamespace"`,
    ]);
    expect(message.schema).toEqual({});
  });
});
