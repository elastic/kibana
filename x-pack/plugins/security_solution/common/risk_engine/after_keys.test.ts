/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { afterKeysSchema } from './after_keys';

describe('after_keys schema', () => {
  it('allows an empty object', () => {
    const payload = {};
    const decoded = afterKeysSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  it('allows a valid host key', () => {
    const payload = { host: { 'host.name': 'hello' } };
    const decoded = afterKeysSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  it('allows a valid user key', () => {
    const payload = { user: { 'user.name': 'hello' } };
    const decoded = afterKeysSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  it('allows both valid host and user keys', () => {
    const payload = { user: { 'user.name': 'hello' }, host: { 'host.name': 'hello' } };
    const decoded = afterKeysSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  it('removes an unknown identifier key if used', () => {
    const payload = { bad: 'key' };
    const decoded = afterKeysSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({});
  });
});
