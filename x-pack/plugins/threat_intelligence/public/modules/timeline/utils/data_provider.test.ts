/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateDataProvider } from './data_provider';

describe('generateDataProvider', () => {
  it('should return DataProvider object', () => {
    const mockField: string = 'field';
    const mockValue: string = 'value';

    const dataProvider = generateDataProvider(mockField, mockValue);
    expect(dataProvider.id).toContain(mockField);
    expect(dataProvider.id).toContain(mockValue);
    expect(dataProvider.name).toEqual(mockValue);
  });
});
