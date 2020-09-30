/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isValidNamespace } from './is_valid_namespace';

describe('Ingest Manager - isValidNamespace', () => {
  it('returns true for valid namespaces', () => {
    expect(isValidNamespace('default').valid).toBe(true);
    expect(isValidNamespace('namespace-with-dash').valid).toBe(true);
    expect(isValidNamespace('123').valid).toBe(true);
    expect(isValidNamespace('testlength😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀').valid).toBe(
      true
    );
  });

  it('returns false for invalid namespaces', () => {
    expect(isValidNamespace('').valid).toBe(false);
    expect(isValidNamespace(' ').valid).toBe(false);
    expect(isValidNamespace('Default').valid).toBe(false);
    expect(isValidNamespace('namespace with spaces').valid).toBe(false);
    expect(isValidNamespace('foo/bar').valid).toBe(false);
    expect(isValidNamespace('foo\\bar').valid).toBe(false);
    expect(isValidNamespace('foo*bar').valid).toBe(false);
    expect(isValidNamespace('foo?bar').valid).toBe(false);
    expect(isValidNamespace('foo"bar').valid).toBe(false);
    expect(isValidNamespace('foo<bar').valid).toBe(false);
    expect(isValidNamespace('foo|bar').valid).toBe(false);
    expect(isValidNamespace('foo,bar').valid).toBe(false);
    expect(isValidNamespace('foo#bar').valid).toBe(false);
    expect(
      isValidNamespace(
        'testlength😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀'
      ).valid
    ).toBe(false);
  });
});
