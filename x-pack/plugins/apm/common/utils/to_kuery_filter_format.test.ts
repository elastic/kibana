/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toKueryFilterFormat } from './to_kuery_filter_format';

describe('toKueryFilterFormat', () => {
  it('returns a single value', () => {
    expect(toKueryFilterFormat('key', ['foo'])).toEqual(`key : "foo"`);
  });

  it('returns multiple values default separator', () => {
    expect(toKueryFilterFormat('key', ['foo', 'bar', 'baz'])).toEqual(
      `key : "foo" OR key : "bar" OR key : "baz"`
    );
  });

  it('returns multiple values custom separator', () => {
    expect(toKueryFilterFormat('key', ['foo', 'bar', 'baz'], 'AND')).toEqual(
      `key : "foo" AND key : "bar" AND key : "baz"`
    );
  });

  it('return empty string when no hostname', () => {
    expect(toKueryFilterFormat('key', [])).toEqual('');
  });
});
