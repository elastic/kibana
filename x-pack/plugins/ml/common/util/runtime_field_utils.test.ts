/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRuntimeField, isRuntimeMappings } from './runtime_field_utils';

describe('ML runtime field utils', () => {
  describe('isRuntimeField()', () => {
    it('does not allow numbers', () => {
      expect(isRuntimeField(1)).toBe(false);
    });
    it('does not allow null', () => {
      expect(isRuntimeField(null)).toBe(false);
    });
    it('does not allow arrays', () => {
      expect(isRuntimeField([])).toBe(false);
    });
    it('does not allow empty objects', () => {
      expect(isRuntimeField({})).toBe(false);
    });
    it('does not allow objects with non-matching attributes', () => {
      expect(isRuntimeField({ someAttribute: 'someValue' })).toBe(false);
      expect(isRuntimeField({ type: 'wrong-type' })).toBe(false);
      expect(isRuntimeField({ type: 'keyword', someAttribute: 'some value' })).toBe(false);
    });
    it('allows objects with type attribute only', () => {
      expect(isRuntimeField({ type: 'keyword' })).toBe(true);
    });
    it('allows objects with both type and script attributes', () => {
      expect(
        isRuntimeField({ type: 'keyword', script: 'some script', format: 'some format' })
      ).toBe(true);
    });
  });

  describe('isRuntimeMappings()', () => {
    it('does not allow numbers', () => {
      expect(isRuntimeMappings(1)).toBe(false);
    });
    it('does not allow null', () => {
      expect(isRuntimeMappings(null)).toBe(false);
    });
    it('does not allow arrays', () => {
      expect(isRuntimeMappings([])).toBe(false);
    });
    it('does not allow empty objects', () => {
      expect(isRuntimeMappings({})).toBe(false);
    });
    it('does not allow objects with non-object inner structure', () => {
      expect(isRuntimeMappings({ someAttribute: 'someValue' })).toBe(false);
    });
    it('does not allow objects with objects with unsupported inner structure', () => {
      expect(isRuntimeMappings({ fieldName1: { type: 'keyword' }, fieldName2: 'someValue' })).toBe(
        false
      );
      expect(
        isRuntimeMappings({
          fieldName1: { type: 'keyword' },
          fieldName2: { type: 'keyword', someAttribute: 'some value' },
        })
      ).toBe(false);
      expect(
        isRuntimeMappings({
          fieldName: { type: 'long', script: 1234 },
        })
      ).toBe(false);
      expect(
        isRuntimeMappings({
          fieldName: { type: 'long', script: { someAttribute: 'some value' } },
        })
      ).toBe(false);
      expect(
        isRuntimeMappings({
          fieldName: { type: 'long', script: { source: 1234 } },
        })
      ).toBe(false);
    });

    it('allows object with most basic runtime field', () => {
      expect(isRuntimeMappings({ fieldName: { type: 'keyword' } })).toBe(true);
    });
    it('allows object with multiple most basic runtime fields', () => {
      expect(
        isRuntimeMappings({ fieldName1: { type: 'keyword' }, fieldName2: { type: 'keyword' } })
      ).toBe(true);
    });
    it('allows object with runtime fields including scripts', () => {
      expect(
        isRuntimeMappings({
          fieldName1: { type: 'keyword' },
          fieldName2: { type: 'keyword', script: 'some script as script' },
          fieldName3: {
            type: 'keyword',
            script: {
              source: 'source script',
            },
          },
          fieldName4: {
            type: 'keyword',
            script: {
              source: 'source script',
              params: {},
            },
          },
        })
      ).toBe(true);
      expect(
        isRuntimeMappings({
          fieldName: { type: 'long', script: { source: 'some script as source' } },
        })
      ).toBe(true);
      expect(
        isRuntimeMappings({
          fieldName: {
            type: 'long',
            script: {
              source: 'source script',
              params: {},
              lang: 'lang',
            },
          },
        })
      ).toBe(true);
      expect(
        isRuntimeMappings({
          fieldName: {
            type: 'long',
            script: {
              id: 'a script id',
            },
          },
        })
      ).toBe(true);
    });
  });
});
