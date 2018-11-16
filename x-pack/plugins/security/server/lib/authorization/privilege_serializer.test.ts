/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrivilegeSerializer } from './privilege_serializer';

describe('#serializeGlobalPrivilege', () => {
  test('throws Error if unrecognized privilege used', () => {
    expect(() =>
      PrivilegeSerializer.serializeGlobalReservedPrivilege('foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test('returns all unmodified', () => {
    const allResult = PrivilegeSerializer.serializeGlobalReservedPrivilege('all');
    expect(allResult).toBe('all');
  });

  test('returns read unmodified', () => {
    const readResult = PrivilegeSerializer.serializeGlobalReservedPrivilege('read');
    expect(readResult).toBe('read');
  });
});

describe('#serializeSpaceReservedPrivilege', () => {
  test('throws Error if unrecognized privilege used', () => {
    expect(() =>
      PrivilegeSerializer.serializeSpaceReservedPrivilege('foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test('returns all prefixed with space_', () => {
    const allResult = PrivilegeSerializer.serializeSpaceReservedPrivilege('all');
    expect(allResult).toBe('space_all');
  });

  test('returns read prefixed with space_', () => {
    const readResult = PrivilegeSerializer.serializeSpaceReservedPrivilege('read');
    expect(readResult).toBe('space_read');
  });
});

describe('#serializeFeaturePrivilege', () => {
  test('returns `feature_${featureName}_${privilegeName}`', () => {
    const result = PrivilegeSerializer.serializeFeaturePrivilege('foo', 'bar');
    expect(result).toBe('feature_foo_bar');
  });
});

describe('#serializePrivilegeAssignedGlobally', () => {
  test(`returns 'all' when 'all' is provided`, () => {
    const result = PrivilegeSerializer.serializePrivilegeAssignedGlobally('all');
    expect(result).toBe('all');
  });

  test(`returns 'read' when 'read' is provided`, () => {
    const result = PrivilegeSerializer.serializePrivilegeAssignedGlobally('read');
    expect(result).toBe('read');
  });

  test('returns `feature_${privilege}` otherwise', () => {
    const result = PrivilegeSerializer.serializePrivilegeAssignedGlobally('foo');
    expect(result).toBe('feature_foo');
  });
});

describe('#serializePrivilegeAssignedAtSpace', () => {
  test(`returns 'space_all' when 'all' is provided`, () => {
    const result = PrivilegeSerializer.serializePrivilegeAssignedAtSpace('all');
    expect(result).toBe('space_all');
  });

  test(`returns 'space_read' when 'read' is provided`, () => {
    const result = PrivilegeSerializer.serializePrivilegeAssignedAtSpace('read');
    expect(result).toBe('space_read');
  });

  test('returns `feature_${privilege}` otherwise', () => {
    const result = PrivilegeSerializer.serializePrivilegeAssignedAtSpace('foo');
    expect(result).toBe('feature_foo');
  });
});

describe('#deserializePrivilegeAssignedGlobally', () => {
  test(`if prefixed with 'feature_' removes the prefix`, () => {
    const result = PrivilegeSerializer.deserializePrivilegeAssignedGlobally('feature_foo');
    expect(result).toBe('foo');
  });

  test(`throws Error if not prefixed with feature_ and isn't a reserved privilege`, () => {
    expect(() =>
      PrivilegeSerializer.deserializePrivilegeAssignedGlobally('foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`returns 'all' unprefixed if provided 'all'`, () => {
    const result = PrivilegeSerializer.deserializePrivilegeAssignedGlobally('all');
    expect(result).toBe('all');
  });

  test(`returns 'read' unprefixed if provided 'read'`, () => {
    const result = PrivilegeSerializer.deserializePrivilegeAssignedGlobally('read');
    expect(result).toBe('read');
  });
});

describe('#deserializePrivilegeAssignedAtSpace', () => {
  test(`if prefixed with 'feature_' removes the prefix`, () => {
    const result = PrivilegeSerializer.deserializePrivilegeAssignedAtSpace('feature_foo');
    expect(result).toBe('foo');
  });

  test(`throws Error if not prefixed with space_`, () => {
    expect(() =>
      PrivilegeSerializer.deserializePrivilegeAssignedAtSpace('all')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`throws Error if prefixed with space_ but not a reserved privilege`, () => {
    expect(() =>
      PrivilegeSerializer.deserializePrivilegeAssignedAtSpace('space_foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`returns 'all' unprefixed if provided 'space_all'`, () => {
    const result = PrivilegeSerializer.deserializePrivilegeAssignedAtSpace('space_all');
    expect(result).toBe('all');
  });

  test(`returns 'read' unprefixed if provided 'space_read'`, () => {
    const result = PrivilegeSerializer.deserializePrivilegeAssignedAtSpace('space_read');
    expect(result).toBe('read');
  });
});
