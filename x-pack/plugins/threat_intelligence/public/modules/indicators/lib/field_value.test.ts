/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndicatorFieldAndValue } from './field_value';
import {
  generateMockFileIndicator,
  generateMockUrlIndicator,
} from '../../../../common/types/indicator';

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
