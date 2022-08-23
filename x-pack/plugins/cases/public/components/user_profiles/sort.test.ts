/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { moveCurrentUserToBeginning } from './sort';

describe('sort', () => {
  describe('moveCurrentUserToBeginning', () => {
    it('returns an empty array if no profiles are provided', () => {
      expect(moveCurrentUserToBeginning()).toEqual([]);
    });

    it("returns the profiles if the current profile isn't provided", () => {
      const profiles = [{ uid: '1' }];
      expect(moveCurrentUserToBeginning(undefined, profiles)).toEqual(profiles);
    });

    it("returns the profiles if the current profile isn't found", () => {
      const profiles = [{ uid: '1' }];
      expect(moveCurrentUserToBeginning({ uid: '2' }, profiles)).toEqual(profiles);
    });

    it('moves the current profile to the front', () => {
      const profiles = [{ uid: '1' }, { uid: '2' }];
      expect(moveCurrentUserToBeginning({ uid: '2' }, profiles)).toEqual([
        { uid: '2' },
        { uid: '1' },
      ]);
    });
  });
});
