/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_ASSIGNEES_VALUE } from './constants';
import { mockUserProfiles } from './mocks';
import { bringCurrentUserToFrontAndSort, removeNoAssigneesSelection } from './utils';

describe('utils', () => {
  describe('removeNoAssigneesSelection', () => {
    it('should return user ids if `no assignees` has not been passed', () => {
      const assignees = ['user1', 'user2', 'user3'];
      const ids = removeNoAssigneesSelection(assignees);
      expect(ids).toEqual(assignees);
    });

    it('should return user ids and remove `no assignees`', () => {
      const assignees = [NO_ASSIGNEES_VALUE, 'user1', 'user2', NO_ASSIGNEES_VALUE, 'user3'];
      const ids = removeNoAssigneesSelection(assignees);
      expect(ids).toEqual(['user1', 'user2', 'user3']);
    });
  });

  describe('bringCurrentUserToFrontAndSort', () => {
    it('should return `undefined` if nothing has been passed', () => {
      const sortedProfiles = bringCurrentUserToFrontAndSort();
      expect(sortedProfiles).toBeUndefined();
    });

    it('should return passed profiles if current user is `undefined`', () => {
      const sortedProfiles = bringCurrentUserToFrontAndSort(undefined, mockUserProfiles);
      expect(sortedProfiles).toEqual(mockUserProfiles);
    });

    it('should return profiles with the current user on top', () => {
      const currentUser = mockUserProfiles[1];
      const sortedProfiles = bringCurrentUserToFrontAndSort(currentUser, mockUserProfiles);
      expect(sortedProfiles).toEqual([currentUser, mockUserProfiles[0], mockUserProfiles[2]]);
    });
  });
});
