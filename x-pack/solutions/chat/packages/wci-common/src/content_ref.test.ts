/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ContentRef,
  ContentRefSourceType,
  serializeContentRef,
  parseContentRef,
} from './content_ref';

describe('ContentRef', () => {
  describe('serializeRef', () => {
    it('should correctly serialize a ContentRef object to a string', () => {
      const contentRef: ContentRef = {
        sourceType: ContentRefSourceType.integration,
        sourceId: 'test-integration',
        contentId: 'test-content',
      };

      const serialized = serializeContentRef(contentRef);
      expect(serialized).toBe('ref||integration||test-integration||test-content');
    });

    it('should handle special characters in the sourceId and contentId', () => {
      const contentRef: ContentRef = {
        sourceType: ContentRefSourceType.integration,
        sourceId: 'test-integration-with/special/chars',
        contentId: 'test-content-with|special&chars',
      };

      const serialized = serializeContentRef(contentRef);
      expect(serialized).toBe(
        'ref||integration||test-integration-with/special/chars||test-content-with|special&chars'
      );
    });
  });

  describe('parseRef', () => {
    it('should correctly parse a serialized string back to a ContentRef object', () => {
      const serialized = 'ref||integration||test-integration||test-content';

      const parsed = parseContentRef(serialized);
      expect(parsed).toEqual({
        sourceType: ContentRefSourceType.integration,
        sourceId: 'test-integration',
        contentId: 'test-content',
      });
    });

    it('should handle special characters in the sourceId and contentId', () => {
      const serialized =
        'ref||integration||test-integration-with/special/chars||test-content-with|special&chars';

      const parsed = parseContentRef(serialized);
      expect(parsed).toEqual({
        sourceType: ContentRefSourceType.integration,
        sourceId: 'test-integration-with/special/chars',
        contentId: 'test-content-with|special&chars',
      });
    });

    it('should throw an error when the serialized string has an invalid format', () => {
      const invalidSerialized = 'invalid-format';

      expect(() => parseContentRef(invalidSerialized)).toThrow(
        'Trying to parse ref with invalid format: invalid-format'
      );
    });

    it('should throw an error when the serialized string has fewer than 4 parts', () => {
      const invalidSerialized = 'ref||integration||test-integration';

      expect(() => parseContentRef(invalidSerialized)).toThrow(
        'Trying to parse ref with invalid format: ref||integration||test-integration'
      );
    });

    it('should throw an error when the serialized string has more than 4 parts', () => {
      const invalidSerialized = 'ref||integration||test-integration||test-content||extra-part';

      expect(() => parseContentRef(invalidSerialized)).toThrow(
        'Trying to parse ref with invalid format: ref||integration||test-integration||test-content||extra-part'
      );
    });

    it('should throw an error when the serialized string does not start with "ref"', () => {
      const invalidSerialized = 'integration||test-integration||test-content';

      expect(() => parseContentRef(invalidSerialized)).toThrow(
        'Trying to parse ref with invalid format: integration||test-integration||test-content'
      );
    });
  });

  describe('serializeRef and parseRef integration', () => {
    it('should correctly serialize and then parse a ContentRef object', () => {
      const originalContentRef: ContentRef = {
        sourceType: ContentRefSourceType.integration,
        sourceId: 'test-integration',
        contentId: 'test-content',
      };

      const serialized = serializeContentRef(originalContentRef);
      const parsed = parseContentRef(serialized);

      expect(parsed).toEqual(originalContentRef);
    });
  });
});
