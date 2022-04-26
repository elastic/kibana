/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { string } from './string';

describe('string', () => {
  const fn = functionWrapper(string);

  it('casts primitive types to strings', () => {
    expect(fn(null, { value: [14000] })).toBe('14000');
    expect(fn(null, { value: ['foo'] })).toBe('foo');
    expect(fn(null, { value: [null] })).toBe('');
    expect(fn(null, { value: [true] })).toBe('true');
  });

  it('concatenates all args to one string', () => {
    expect(fn(null, { value: ['foo', 'bar', 'fizz', 'buzz'] })).toBe('foobarfizzbuzz');
    expect(fn(null, { value: ['foo', 1, true, null] })).toBe('foo1true');
  });
});
