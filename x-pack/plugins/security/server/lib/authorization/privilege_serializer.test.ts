/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrivilegeSerializer } from './privilege_serializer';

describe(`#isGlobalMinimumPrivilege`, () => {
  ['all', 'read'].forEach(validValue => {
    test(`returns true for '${validValue}'`, () => {
      expect(PrivilegeSerializer.isGlobalMinimumPrivilege(validValue)).toBe(true);
    });
  });

  ['space_all', 'space_read', 'foo', 'bar', 'feature_foo', 'feature_foo.privilege1'].forEach(
    validValue => {
      test(`returns true for '${validValue}'`, () => {
        expect(PrivilegeSerializer.isGlobalMinimumPrivilege(validValue)).toBe(false);
      });
    }
  );
});

describe(`#isSpaceMinimumPrivilege`, () => {
  ['space_all', 'space_read'].forEach(validValue => {
    test(`returns true for '${validValue}'`, () => {
      expect(PrivilegeSerializer.isSpaceMinimumPrivilege(validValue)).toBe(true);
    });
  });

  ['all', 'read', 'foo', 'bar', 'feature_foo', 'feature_foo.privilege1'].forEach(validValue => {
    test(`returns true for '${validValue}'`, () => {
      expect(PrivilegeSerializer.isSpaceMinimumPrivilege(validValue)).toBe(false);
    });
  });
});

describe('#serializeGlobalMinimumPrivilege', () => {
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
  test('returns `feature_${featureName}.${privilegeName}`', () => {
    const result = PrivilegeSerializer.serializeFeaturePrivilege('foo', 'bar');
    expect(result).toBe('feature_foo.bar');
  });
});

describe('#deserializeFeaturePrivilege', () => {
  [
    {
      privilege: 'feature_foo.privilege-1',
      expectedResult: {
        featureId: 'foo',
        privilege: 'privilege-1',
      },
    },
    {
      privilege: 'feature_foo_bar.foo_privilege-1',
      expectedResult: {
        featureId: 'foo_bar',
        privilege: 'foo_privilege-1',
      },
    },
  ].forEach(({ privilege, expectedResult }) => {
    test(`deserializes '${privilege}' to ${JSON.stringify(expectedResult)}`, () => {
      const result = PrivilegeSerializer.deserializeFeaturePrivilege(privilege);
      expect(result).toEqual(expectedResult);
    });
  });

  [
    'feature-foo.privilege-1', // doesn't start with feature_
    'foo_feature_foo.privilege-1', // also doesn't start with feature_
    'feature_foo_privilege-1', // no '.'
    'feature_foo.', // has a '.' but nothing after it
    'feature_.privilege-1', // nothing before the '.'
  ].forEach(privilege => {
    test(`throws error when deserializing ${privilege}`, () => {
      expect(() =>
        PrivilegeSerializer.deserializeFeaturePrivilege(privilege)
      ).toThrowErrorMatchingSnapshot();
    });
  });
});

describe('#deserializeGlobalMinimumPrivilege', () => {
  test(`throws Error if isn't a minimum privilege`, () => {
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
  test(`throws Error if provided 'all'`, () => {
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
