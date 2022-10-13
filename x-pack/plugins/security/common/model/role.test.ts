/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '.';
import {
  copyRole,
  getExtendedRoleDeprecationNotice,
  isRoleDeprecated,
  isRoleEnabled,
  isRoleReadOnly,
  isRoleReserved,
  prepareRoleClone,
} from '.';

describe('role', () => {
  describe('isRoleEnabled', () => {
    test('should return false if role is explicitly not enabled', () => {
      const testRole = {
        transient_metadata: {
          enabled: false,
        },
      };
      expect(isRoleEnabled(testRole)).toBe(false);
    });

    test('should return true if role is explicitly enabled', () => {
      const testRole = {
        transient_metadata: {
          enabled: true,
        },
      };
      expect(isRoleEnabled(testRole)).toBe(true);
    });

    test('should return true if role is NOT explicitly enabled or disabled', () => {
      const testRole = {};
      expect(isRoleEnabled(testRole)).toBe(true);
    });
  });

  describe('isRoleReserved', () => {
    test('should return false if role is explicitly not reserved', () => {
      const testRole = {
        metadata: {
          _reserved: false,
        },
      };
      expect(isRoleReserved(testRole)).toBe(false);
    });

    test('should return true if role is explicitly reserved', () => {
      const testRole = {
        metadata: {
          _reserved: true,
        },
      };
      expect(isRoleReserved(testRole)).toBe(true);
    });

    test('should return false if role is NOT explicitly reserved or not reserved', () => {
      const testRole = {};
      expect(isRoleReserved(testRole)).toBe(false);
    });
  });

  describe('isRoleDeprecated', () => {
    test('should return false if role is explicitly not deprecated', () => {
      const testRole = {
        metadata: {
          _deprecated: false,
        },
      };
      expect(isRoleDeprecated(testRole)).toBe(false);
    });

    test('should return true if role is explicitly deprecated', () => {
      const testRole = {
        metadata: {
          _deprecated: true,
        },
      };
      expect(isRoleDeprecated(testRole)).toBe(true);
    });

    test('should return false if role is NOT explicitly deprecated or not deprecated', () => {
      const testRole = {};
      expect(isRoleDeprecated(testRole)).toBe(false);
    });
  });

  describe('getExtendedRoleDeprecationNotice', () => {
    test('advises not to use the deprecated role', () => {
      const testRole = { name: 'test-role' };
      expect(getExtendedRoleDeprecationNotice(testRole)).toMatchInlineSnapshot(
        `"The test-role role is deprecated. "`
      );
    });

    test('includes the deprecation reason when provided', () => {
      const testRole = {
        name: 'test-role',
        metadata: { _deprecated_reason: "We just don't like this role anymore" },
      };
      expect(getExtendedRoleDeprecationNotice(testRole)).toMatchInlineSnapshot(
        `"The test-role role is deprecated. We just don't like this role anymore"`
      );
    });
  });

  describe('isRoleReadOnly', () => {
    test('returns true for reserved roles', () => {
      const testRole = {
        metadata: {
          _reserved: true,
        },
      };
      expect(isRoleReadOnly(testRole)).toBe(true);
    });

    test('returns true for roles with transform errors', () => {
      const testRole = {
        _transform_error: ['kibana'],
      };
      expect(isRoleReadOnly(testRole)).toBe(true);
    });

    test('returns false for disabled roles', () => {
      const testRole = {
        transient_metadata: {
          enabled: false,
        },
      };
      expect(isRoleReadOnly(testRole)).toBe(false);
    });

    test('returns false for all other roles', () => {
      const testRole = {};
      expect(isRoleReadOnly(testRole)).toBe(false);
    });
  });

  describe('copyRole', () => {
    it('should perform a deep copy', () => {
      const role: Role = {
        name: '',
        elasticsearch: {
          cluster: ['all'],
          indices: [{ names: ['index*'], privileges: ['all'] }],
          run_as: ['user'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['default'],
            base: ['foo'],
            feature: {},
          },
          {
            spaces: ['marketing'],
            base: ['read'],
            feature: {},
          },
        ],
      };

      const result = copyRole(role);
      expect(result).toEqual(role);

      role.elasticsearch.indices[0].names = ['something else'];

      expect(result).not.toEqual(role);
    });
  });

  describe('prepareRoleClone', () => {
    it('should return a copy of the role, with a blank role name', () => {
      const role: Role = {
        name: 'my_role',
        elasticsearch: {
          cluster: ['all'],
          indices: [{ names: ['index*'], privileges: ['all'] }],
          run_as: ['user'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['default'],
            base: ['foo'],
            feature: {},
          },
          {
            spaces: ['marketing'],
            base: ['read'],
            feature: {},
          },
        ],
        metadata: {
          _reserved: true,
        },
        transient_metadata: {
          enabled: false,
        },
      };

      const { name: originalName, ...originalRest } = role;

      const result = prepareRoleClone(role);
      const { name, ...rest } = result;

      expect(originalName).toEqual('my_role');
      expect(name).toEqual('');

      expect(rest).toEqual(originalRest);
    });
  });
});
