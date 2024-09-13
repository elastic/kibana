/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AfterKeys } from '.';
import type { SafeParseSuccess } from '@kbn/zod';

describe('after_keys schema', () => {
  it('allows an empty object', () => {
    const payload = {};
    const decoded = AfterKeys.safeParse(payload) as SafeParseSuccess<object>;

    expect(decoded.success).toBeTruthy();
    expect(decoded.data).toEqual(payload);
  });

  it('allows a valid host key', () => {
    const payload = { host: { 'host.name': 'hello' } };
    const decoded = AfterKeys.safeParse(payload) as SafeParseSuccess<object>;

    expect(decoded.success).toBeTruthy();
    expect(decoded.data).toEqual(payload);
  });

  it('allows a valid user key', () => {
    const payload = { user: { 'user.name': 'hello' } };
    const decoded = AfterKeys.safeParse(payload) as SafeParseSuccess<object>;

    expect(decoded.success).toBeTruthy();
    expect(decoded.data).toEqual(payload);
  });

  it('allows both valid host and user keys', () => {
    const payload = { user: { 'user.name': 'hello' }, host: { 'host.name': 'hello' } };
    const decoded = AfterKeys.safeParse(payload) as SafeParseSuccess<object>;

    expect(decoded.success).toBeTruthy();
    expect(decoded.data).toEqual(payload);
  });

  it('removes an unknown identifier key if used', () => {
    const payload = { bad: 'key' };

    const decoded = AfterKeys.safeParse(payload) as SafeParseSuccess<object>;

    expect(decoded.success).toBeTruthy();
    expect(decoded.data).toEqual({});
  });
});
