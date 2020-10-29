/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateTagColor, validateTagName, validateTagDescription } from './validation';

describe('Tag attributes validation', () => {
  describe('validateTagName', () => {
    it('returns an error message if the name is too short', () => {
      expect(validateTagName('a')).toMatchInlineSnapshot(
        `"Tag name must be at least 2 characters"`
      );
    });

    it('returns an error message if the name is too long', () => {
      expect(validateTagName('a'.repeat(55))).toMatchInlineSnapshot(
        `"Tag name may not exceed 50 characters"`
      );
    });

    it('returns an error message if the name contains invalid characters', () => {
      expect(validateTagName('t^ag+name&')).toMatchInlineSnapshot(
        `"Tag name can only include a-z, 0-9, _, -,:."`
      );
    });
  });

  describe('validateTagColor', () => {
    it('returns no error for valid uppercase hex colors', () => {
      expect(validateTagColor('#F7D8C4')).toBeUndefined();
    });
    it('returns no error for valid lowercase hex colors', () => {
      expect(validateTagColor('#4ac1b7')).toBeUndefined();
    });
    it('returns no error for valid mixed case hex colors', () => {
      expect(validateTagColor('#AfeBdC')).toBeUndefined();
    });
    it('returns an error for 3 chars hex colors', () => {
      expect(validateTagColor('#AAA')).toMatchInlineSnapshot(
        `"Tag color must be a valid hex color"`
      );
    });
    it('returns an error for invalid hex colors', () => {
      expect(validateTagColor('#Z1B2C3')).toMatchInlineSnapshot(
        `"Tag color must be a valid hex color"`
      );
    });
    it('returns an error for other strings', () => {
      expect(validateTagColor('hello dolly')).toMatchInlineSnapshot(
        `"Tag color must be a valid hex color"`
      );
    });
  });

  describe('validateTagDescription', () => {
    it('returns an error message if the description is too long', () => {
      expect(validateTagDescription('a'.repeat(101))).toMatchInlineSnapshot(
        `"Tag description may not exceed 100 characters"`
      );
    });

    it('returns no error if the description is valid', () => {
      expect(validateTagDescription('some valid description')).toBeUndefined();
    });
  });
});
