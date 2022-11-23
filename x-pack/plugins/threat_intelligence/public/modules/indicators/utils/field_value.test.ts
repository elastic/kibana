/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldAndValueValid, getIndicatorFieldAndValue } from './field_value';
import {
  generateMockFileIndicator,
  generateMockUrlIndicator,
} from '../../../../common/types/indicator';
import { EMPTY_VALUE } from '../../../common/constants';

describe('field_value', () => {
  describe('getIndicatorFieldAndValue()', () => {
    it('should return field/value pair for an indicator', () => {
      const mockData = generateMockUrlIndicator();
      const mockKey = 'threat.feed.name';

      const result = getIndicatorFieldAndValue(mockData, mockKey);
      expect(result.key).toEqual(mockKey);
      expect(result.value).toEqual((mockData.fields[mockKey] as unknown as string[])[0]);
    });

    it('should return a null value for an incorrect field', () => {
      const mockData = generateMockUrlIndicator();
      const mockKey = 'abc';

      const result = getIndicatorFieldAndValue(mockData, mockKey);
      expect(result.key).toEqual(mockKey);
      expect(result.value).toBeNull();
    });

    it('should return field/value pair for an indicator and DisplayName field', () => {
      const mockData = generateMockFileIndicator();
      const mockKey = 'threat.indicator.name';

      const result = getIndicatorFieldAndValue(mockData, mockKey);
      expect(result.key).toEqual(
        (mockData.fields['threat.indicator.name_origin'] as unknown as string[])[0]
      );
      expect(result.value).toEqual((mockData.fields[mockKey] as unknown as string[])[0]);
    });
  });

  describe('fieldAndValueValid()', () => {
    it('should return false for null value', () => {
      const mockField = 'abc';
      const mockValue = null;

      const result = fieldAndValueValid(mockField, mockValue);
      expect(result).toEqual(false);
    });

    it('should return false for empty string value', () => {
      const mockField = 'abc';
      const mockValue = '';

      const result = fieldAndValueValid(mockField, mockValue);
      expect(result).toEqual(false);
    });

    it(`should return false for ${EMPTY_VALUE} value`, () => {
      const mockField = 'abc';
      const mockValue = EMPTY_VALUE;

      const result = fieldAndValueValid(mockField, mockValue);
      expect(result).toEqual(false);
    });

    it('should return false for empty field', () => {
      const mockField = '';
      const mockValue = 'abc';

      const result = fieldAndValueValid(mockField, mockValue);
      expect(result).toEqual(false);
    });

    it('should return true if field and value are correct', () => {
      const mockField = 'abc';
      const mockValue = 'abc';

      const result = fieldAndValueValid(mockField, mockValue);
      expect(result).toEqual(true);
    });
  });
});
