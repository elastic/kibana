/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isValidNamespace } from './is_valid_namespace';

describe('Ingest Manager - isValidNamespace', () => {
  it('returns true for valid namespaces', () => {
    expect(isValidNamespace('default')).toBe(true);
    expect(isValidNamespace('namespace-with-dash')).toBe(true);
    expect(isValidNamespace('123')).toBe(true);
  });

  it('returns false for invalid namespaces', () => {
    expect(isValidNamespace('Default')).toBe(false);
    expect(isValidNamespace('namespace with spaces')).toBe(false);
    expect(isValidNamespace('foo/bar')).toBe(false);
    expect(isValidNamespace('foo\\bar')).toBe(false);
    expect(isValidNamespace('foo*bar')).toBe(false);
    expect(isValidNamespace('foo?bar')).toBe(false);
    expect(isValidNamespace('foo"bar')).toBe(false);
    expect(isValidNamespace('foo<bar')).toBe(false);
    expect(isValidNamespace('foo|bar')).toBe(false);
    expect(isValidNamespace('foo,bar')).toBe(false);
    expect(isValidNamespace('foo#bar')).toBe(false);
  });
});
