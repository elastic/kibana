/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extendFieldsWithAllowedValues } from './extend_fields_with_allowed_values';

describe('extendFieldsWithAllowedValues()', () => {
  it('should append allowedValues to a field with strict rules', () => {
    const eventCategoryAllowedValues = extendFieldsWithAllowedValues([
      { field: 'event.category', type: 'keyword' },
    ])[0].allowedValues;

    expect(eventCategoryAllowedValues).toBeInstanceOf(Array);
    expect(eventCategoryAllowedValues?.length).toBeGreaterThan(1);
  });

  it('should not alter a field with no precise description for allowed values', () => {
    const allowedValuesForAField = extendFieldsWithAllowedValues([
      { field: 'made.up.field', type: 'keyword' },
    ]);

    expect(allowedValuesForAField).toBeInstanceOf(Array);
    expect(allowedValuesForAField.length).toEqual(0);
  });
});
