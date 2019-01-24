/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isReservedRole, isRoleEnabled } from './role';

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

  describe('isReservedRole', () => {
    test('should return false if role is explicitly not reserved', () => {
      const testRole = {
        metadata: {
          _reserved: false,
        },
      };
      expect(isReservedRole(testRole)).toBe(false);
    });

    test('should return true if role is explicitly reserved', () => {
      const testRole = {
        metadata: {
          _reserved: true,
        },
      };
      expect(isReservedRole(testRole)).toBe(true);
    });

    test('should return false if role is NOT explicitly reserved or not reserved', () => {
      const testRole = {};
      expect(isReservedRole(testRole)).toBe(false);
    });
  });
});
