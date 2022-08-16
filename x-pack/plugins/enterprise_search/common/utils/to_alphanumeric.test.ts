/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toAlphanumeric } from './to_alphanumeric';

describe('toAlphanumeric', () => {
  it('replaces non-alphanumeric characters with dashes', () => {
    expect(toAlphanumeric('f1  &&o$ 1  2 *&%da')).toEqual('f1-o-1-2-da');
  });

  it('strips leading and trailing non-alphanumeric characters', () => {
    expect(toAlphanumeric('$$hello world**')).toEqual('hello-world');
  });

  it('strips leading and trailing whitespace', () => {
    expect(toAlphanumeric('  test  ')).toEqual('test');
  });

  it('lowercases text', () => {
    expect(toAlphanumeric('SomeName')).toEqual('somename');
  });
});
