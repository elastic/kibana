/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrivilegeSerializer } from './privilege_serializer';

describe(`#isSerializedGlobalBasePrivilege`, () => {
  ['all', 'read'].forEach((validValue) => {
    test(`returns true for '${validValue}'`, () => {
      expect(PrivilegeSerializer.isSerializedGlobalBasePrivilege(validValue)).toBe(true);
    });
  });

  ['space_all', 'space_read', 'foo', 'bar', 'feature_foo', 'feature_foo.privilege1'].forEach(
    (invalidValue) => {
      test(`returns false for '${invalidValue}'`, () => {
        expect(PrivilegeSerializer.isSerializedGlobalBasePrivilege(invalidValue)).toBe(false);
      });
    }
  );
});

describe(`#isSerializedSpaceBasePrivilege`, () => {
  ['space_all', 'space_read'].forEach((validValue) => {
    test(`returns true for '${validValue}'`, () => {
      expect(PrivilegeSerializer.isSerializedSpaceBasePrivilege(validValue)).toBe(true);
    });
  });

  ['all', 'read', 'foo', 'bar', 'feature_foo', 'feature_foo.privilege1'].forEach((invalid) => {
    test(`returns false for '${invalid}'`, () => {
      expect(PrivilegeSerializer.isSerializedSpaceBasePrivilege(invalid)).toBe(false);
    });
  });
});

describe(`#isSerializedReservedPrivilege`, () => {
  ['reserved_foo', 'reserved_bar'].forEach((validValue) => {
    test(`returns true for '${validValue}'`, () => {
      expect(PrivilegeSerializer.isSerializedReservedPrivilege(validValue)).toBe(true);
    });
  });

  [
    'all',
    'read',
    'space_all',
    'space_reserved',
    'foo_reserved',
    'bar',
    'feature_foo',
    'feature_foo.privilege1',
  ].forEach((invalidValue) => {
    test(`returns false for '${invalidValue}'`, () => {
      expect(PrivilegeSerializer.isSerializedReservedPrivilege(invalidValue)).toBe(false);
    });
  });
});

describe(`#isSerializedFeaturePrivilege`, () => {
  ['feature_foo.privilege1', 'feature_bar.privilege2'].forEach((validValue) => {
    test(`returns true for '${validValue}'`, () => {
      expect(PrivilegeSerializer.isSerializedFeaturePrivilege(validValue)).toBe(true);
    });
  });

  ['all', 'read', 'space_all', 'space_read', 'reserved_foo', 'reserved_bar'].forEach(
    (invalidValue) => {
      test(`returns false for '${invalidValue}'`, () => {
        expect(PrivilegeSerializer.isSerializedFeaturePrivilege(invalidValue)).toBe(false);
      });
    }
  );
});

describe('#serializeGlobalBasePrivilege', () => {
  test('throws Error if unrecognized privilege used', () => {
    expect(() =>
      PrivilegeSerializer.serializeGlobalBasePrivilege('foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test('returns all unmodified', () => {
    const allResult = PrivilegeSerializer.serializeGlobalBasePrivilege('all');
    expect(allResult).toBe('all');
  });

  test('returns read unmodified', () => {
    const readResult = PrivilegeSerializer.serializeGlobalBasePrivilege('read');
    expect(readResult).toBe('read');
  });
});

describe('#serializeSpaceBasePrivilege', () => {
  test('throws Error if unrecognized privilege used', () => {
    expect(() =>
      PrivilegeSerializer.serializeSpaceBasePrivilege('foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test('returns all prefixed with space_', () => {
    const allResult = PrivilegeSerializer.serializeSpaceBasePrivilege('all');
    expect(allResult).toBe('space_all');
  });

  test('returns read prefixed with space_', () => {
    const readResult = PrivilegeSerializer.serializeSpaceBasePrivilege('read');
    expect(readResult).toBe('space_read');
  });
});

describe('#serializeFeaturePrivilege', () => {
  test('returns `feature_${featureName}.${privilegeName}`', () => {
    const result = PrivilegeSerializer.serializeFeaturePrivilege('foo', 'bar');
    expect(result).toBe('feature_foo.bar');
  });
});

describe('#serializeReservedPrivilege', () => {
  test('returns `reserved_${privilegeName}`', () => {
    const result = PrivilegeSerializer.serializeReservedPrivilege('foo');
    expect(result).toBe('reserved_foo');
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
  ].forEach((privilege) => {
    test(`throws error when deserializing ${privilege}`, () => {
      expect(() =>
        PrivilegeSerializer.deserializeFeaturePrivilege(privilege)
      ).toThrowErrorMatchingSnapshot();
    });
  });
});

describe('#deserializeGlobalBasePrivilege', () => {
  test(`throws Error if isn't a base privilege`, () => {
    expect(() =>
      PrivilegeSerializer.deserializeGlobalBasePrivilege('foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`returns 'all' unprefixed if provided 'all'`, () => {
    const result = PrivilegeSerializer.deserializeGlobalBasePrivilege('all');
    expect(result).toBe('all');
  });

  test(`returns 'read' unprefixed if provided 'read'`, () => {
    const result = PrivilegeSerializer.deserializeGlobalBasePrivilege('read');
    expect(result).toBe('read');
  });
});

describe('#deserializeSpaceBasePrivilege', () => {
  test(`throws Error if provided 'all'`, () => {
    expect(() =>
      PrivilegeSerializer.deserializeSpaceBasePrivilege('all')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`throws Error if prefixed with space_ but not a reserved privilege`, () => {
    expect(() =>
      PrivilegeSerializer.deserializeSpaceBasePrivilege('space_foo')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`returns 'all' unprefixed if provided 'space_all'`, () => {
    const result = PrivilegeSerializer.deserializeSpaceBasePrivilege('space_all');
    expect(result).toBe('all');
  });

  test(`returns 'read' unprefixed if provided 'space_read'`, () => {
    const result = PrivilegeSerializer.deserializeSpaceBasePrivilege('space_read');
    expect(result).toBe('read');
  });
});

describe('#deserializeReservedPrivilege', () => {
  test(`throws Error if doesn't start with reserved_`, () => {
    expect(() =>
      PrivilegeSerializer.deserializeReservedPrivilege('all')
    ).toThrowErrorMatchingSnapshot();
  });

  test(`returns 'customApplication1' unprefixed if provided 'reserved_customApplication1'`, () => {
    const result = PrivilegeSerializer.deserializeReservedPrivilege('reserved_customApplication1');
    expect(result).toBe('customApplication1');
  });
});
