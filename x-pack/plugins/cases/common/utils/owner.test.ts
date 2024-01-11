/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OWNER_INFO } from '../constants';
import { getCaseOwnerByAppId, isValidOwner } from './owner';

describe('owner utils', () => {
  describe('isValidOwner', () => {
    const owners = Object.keys(OWNER_INFO) as Array<keyof typeof OWNER_INFO>;

    it.each(owners)('returns true for valid owner: %s', (owner) => {
      expect(isValidOwner(owner)).toBe(true);
    });

    it('return false for invalid owner', () => {
      expect(isValidOwner('not-valid')).toBe(false);
    });
  });

  describe('getCaseOwnerByAppId', () => {
    const tests = Object.values(OWNER_INFO).map((info) => [info.id, info.appId]);

    it.each(tests)('for owner %s it returns %s', (owner, appId) => {
      expect(getCaseOwnerByAppId(appId)).toBe(owner);
    });

    it('return undefined for invalid application ID', () => {
      expect(getCaseOwnerByAppId('not-valid')).toBe(undefined);
    });
  });
});
