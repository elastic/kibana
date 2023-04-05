/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ASSIGNEES_PER_CASE } from '../constants';
import { isInvalidTag, areTotalAssigneesInvalid } from './validators';

describe('validators', () => {
  describe('isInvalidTag', () => {
    it('validates a whitespace correctly', () => {
      expect(isInvalidTag(' ')).toBe(true);
    });

    it('validates an empty string correctly', () => {
      expect(isInvalidTag('')).toBe(true);
    });

    it('returns false if the string is not empty', () => {
      expect(isInvalidTag('string')).toBe(false);
    });

    it('returns false if the string contains spaces', () => {
      // Ending space has been put intentionally
      expect(isInvalidTag('my string ')).toBe(false);
    });
  });

  describe('areTotalAssigneesInvalid', () => {
    const generateAssignees = (num: number) =>
      Array.from(Array(num).keys()).map((uid) => {
        return { uid: `${uid}` };
      });

    it('validates undefined assignees correctly', () => {
      expect(areTotalAssigneesInvalid()).toBe(false);
    });

    it(`returns false if assignees are less than ${MAX_ASSIGNEES_PER_CASE}`, () => {
      expect(areTotalAssigneesInvalid(generateAssignees(3))).toBe(false);
    });

    it(`returns false if assignees are equal to ${MAX_ASSIGNEES_PER_CASE}`, () => {
      expect(areTotalAssigneesInvalid(generateAssignees(MAX_ASSIGNEES_PER_CASE))).toBe(false);
    });

    it(`returns true if assignees are greater than ${MAX_ASSIGNEES_PER_CASE}`, () => {
      expect(areTotalAssigneesInvalid(generateAssignees(MAX_ASSIGNEES_PER_CASE + 1))).toBe(true);
    });
  });
});
