/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFirstKeyInObject, isPopulatedObject } from './object_utils';

describe('object_utils', () => {
  describe('isPopulatedObject()', () => {
    it('does not allow numbers', () => {
      expect(isPopulatedObject(0)).toBe(false);
    });
    it('does not allow strings', () => {
      expect(isPopulatedObject('')).toBe(false);
    });
    it('does not allow null', () => {
      expect(isPopulatedObject(null)).toBe(false);
    });
    it('does not allow an empty object', () => {
      expect(isPopulatedObject({})).toBe(false);
    });
    it('allows an object with an attribute', () => {
      expect(isPopulatedObject({ attribute: 'value' })).toBe(true);
    });
    it('does not allow an object with a non-existing required attribute', () => {
      expect(isPopulatedObject({ attribute: 'value' }, ['otherAttribute'])).toBe(false);
    });
    it('allows an object with an existing required attribute', () => {
      expect(isPopulatedObject({ attribute: 'value' }, ['attribute'])).toBe(true);
    });
    it('allows an object with two existing required attributes', () => {
      expect(
        isPopulatedObject({ attribute1: 'value1', attribute2: 'value2' }, [
          'attribute1',
          'attribute2',
        ])
      ).toBe(true);
    });
    it('does not allow an object with two required attributes where one does not exist', () => {
      expect(
        isPopulatedObject({ attribute1: 'value1', attribute2: 'value2' }, [
          'attribute1',
          'otherAttribute',
        ])
      ).toBe(false);
    });
  });

  describe('getFirstKeyInObject()', () => {
    it('gets the first key in object', () => {
      expect(getFirstKeyInObject({ attribute1: 'value', attribute2: 'value2' })).toBe('attribute1');
    });

    it('returns undefined with invalid argument', () => {
      expect(getFirstKeyInObject(undefined)).toBe(undefined);
      expect(getFirstKeyInObject(null)).toBe(undefined);
      expect(getFirstKeyInObject({})).toBe(undefined);
      expect(getFirstKeyInObject('value')).toBe(undefined);
      expect(getFirstKeyInObject(5)).toBe(undefined);
    });
  });
});
