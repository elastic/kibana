/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { isRoleEnabled } from '../role';

describe('role', () => {
  describe('isRoleEnabled', () => {
    it('should return false if role is explicitly not enabled', () => {
      const testRole = {
        transient_metadata: {
          enabled: false
        }
      };
      expect(isRoleEnabled(testRole)).to.be(false);
    });

    it('should return true if role is explicitly enabled', () => {
      const testRole = {
        transient_metadata: {
          enabled: true
        }
      };
      expect(isRoleEnabled(testRole)).to.be(true);
    });

    it('should return true if role is NOT explicitly enabled or disabled', () => {
      const testRole = {};
      expect(isRoleEnabled(testRole)).to.be(true);
    });
  });
});
