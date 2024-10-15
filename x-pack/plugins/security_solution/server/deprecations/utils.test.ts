/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { roleHasReadAccess } from './utils';
import { getRoleMock } from './utils.mock';

describe('deprecation utils', () => {
  describe('roleHasReadAccess', () => {
    it('returns true if the role has read privilege to all signals indexes', () => {
      const role = getRoleMock([
        {
          names: ['.siem-signals-*'],
          privileges: ['read'],
        },
      ]);
      expect(roleHasReadAccess(role)).toEqual(true);
    });

    it('returns true if the role has read privilege to a single signals index', () => {
      const role = getRoleMock([
        {
          names: ['.siem-signals-spaceId'],
          privileges: ['read'],
        },
      ]);
      expect(roleHasReadAccess(role)).toEqual(true);
    });

    it('returns true if the role has all privilege to a single signals index', () => {
      const role = getRoleMock([
        {
          names: ['.siem-signals-spaceId', 'other-index'],
          privileges: ['all'],
        },
      ]);
      expect(roleHasReadAccess(role)).toEqual(true);
    });

    it('returns false if the role has read privilege to other indices', () => {
      const role = getRoleMock([
        {
          names: ['other-index'],
          privileges: ['read'],
        },
      ]);
      expect(roleHasReadAccess(role)).toEqual(false);
    });

    it('returns false if the role has all privilege to other indices', () => {
      const role = getRoleMock([
        {
          names: ['other-index', 'second-index'],
          privileges: ['all'],
        },
      ]);
      expect(roleHasReadAccess(role)).toEqual(false);
    });

    it('returns false if the role has no specific privileges', () => {
      const role = getRoleMock();
      expect(roleHasReadAccess(role)).toEqual(false);
    });
  });
});
