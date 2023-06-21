/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ASSIGNEES_PER_CASE, MAX_CATEGORY_LENGTH } from '../constants';
import {
  isInvalidTag,
  areTotalAssigneesInvalid,
  isCategoryFieldInvalidString,
  isCategoryFieldTooLong,
} from './validators';

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

  describe('isCategoryFieldInvalidString', () => {
    it('validates undefined categories correctly', () => {
      expect(isCategoryFieldInvalidString()).toBe(false);
    });

    it('validates null categories correctly', () => {
      expect(isCategoryFieldInvalidString(null)).toBe(false);
    });

    it('returns false if the category is a non-empty string', () => {
      expect(isCategoryFieldInvalidString('foobar')).toBe(false);
    });

    it('returns true if the category is an empty string', () => {
      expect(isCategoryFieldInvalidString('')).toBe(true);
    });

    it('returns true if the string contains only spaces', () => {
      expect(isCategoryFieldInvalidString(' ')).toBe(true);
    });
  });

  describe('isCategoryFieldTooLong', () => {
    it('validates undefined categories correctly', () => {
      expect(isCategoryFieldTooLong()).toBe(false);
    });

    it('validates null categories correctly', () => {
      expect(isCategoryFieldTooLong(null)).toBe(false);
    });

    it(`returns false if the category is smaller than ${MAX_CATEGORY_LENGTH}`, () => {
      expect(isCategoryFieldTooLong('foobar')).toBe(false);
    });

    it(`returns true if the category is longer than ${MAX_CATEGORY_LENGTH}`, () => {
      expect(isCategoryFieldTooLong('A very long category with more than fifty characters!')).toBe(
        true
      );
    });
  });
});
