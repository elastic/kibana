/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrivilegeSerializer } from './privilege_serializer';

describe('#serializeGlobalPrivilege', () => {
  test('throws Error if unrecognized privilege used', () => {
    expect(() =>
      PrivilegeSerializer.serializeGlobalMinimumPrivilege('foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test('returns all unmodified', () => {
    const allResult = PrivilegeSerializer.serializeGlobalMinimumPrivilege('all');
    expect(allResult).toBe('all');
  });

  test('returns read unmodified', () => {
    const readResult = PrivilegeSerializer.serializeGlobalMinimumPrivilege('read');
    expect(readResult).toBe('read');
  });
});

describe('#serializeSpaceMinimumPrivilege', () => {
  test('throws Error if unrecognized privilege used', () => {
    expect(() =>
      PrivilegeSerializer.serializeSpaceMinimumPrivilege('foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test('returns all prefixed with space_', () => {
    const allResult = PrivilegeSerializer.serializeSpaceMinimumPrivilege('all');
    expect(allResult).toBe('space_all');
  });

  test('returns read prefixed with space_', () => {
    const readResult = PrivilegeSerializer.serializeSpaceMinimumPrivilege('read');
    expect(readResult).toBe('space_read');
  });
});

describe('#serializeFeaturePrivilege', () => {
  test('returns `feature_${featureName}_${privilegeName}`', () => {
    const result = PrivilegeSerializer.serializeFeaturePrivilege('foo', 'bar');
    expect(result).toBe('feature_foo_bar');
  });
});

describe('#deserializeGlobalMinimumPrivilege', () => {
  test(`if prefixed with 'feature_' removes the prefix`, () => {
    const result = PrivilegeSerializer.deserializeGlobalMinimumPrivilege('feature_foo');
    expect(result).toBe('foo');
  });

  test(`throws Error if not prefixed with feature_ and isn't a reserved privilege`, () => {
    expect(() =>
      PrivilegeSerializer.deserializeGlobalMinimumPrivilege('foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`returns 'all' unprefixed if provided 'all'`, () => {
    const result = PrivilegeSerializer.deserializeGlobalMinimumPrivilege('all');
    expect(result).toBe('all');
  });

  test(`returns 'read' unprefixed if provided 'read'`, () => {
    const result = PrivilegeSerializer.deserializeGlobalMinimumPrivilege('read');
    expect(result).toBe('read');
  });
});

describe('#deserializeSpaceMinimumPrivilege', () => {
  test(`if prefixed with 'feature_' removes the prefix`, () => {
    const result = PrivilegeSerializer.deserializeSpaceMinimumPrivilege('feature_foo');
    expect(result).toBe('foo');
  });

  test(`throws Error if not prefixed with space_`, () => {
    expect(() =>
      PrivilegeSerializer.deserializeSpaceMinimumPrivilege('all')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`throws Error if prefixed with space_ but not a reserved privilege`, () => {
    expect(() =>
      PrivilegeSerializer.deserializeSpaceMinimumPrivilege('space_foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`returns 'all' unprefixed if provided 'space_all'`, () => {
    const result = PrivilegeSerializer.deserializeSpaceMinimumPrivilege('space_all');
    expect(result).toBe('all');
  });

  test(`returns 'read' unprefixed if provided 'space_read'`, () => {
    const result = PrivilegeSerializer.deserializeSpaceMinimumPrivilege('space_read');
    expect(result).toBe('read');
  });
});
