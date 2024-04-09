/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateParsedContent, validateFile } from './validations';

describe('validateParsedContent', () => {
  it('should return valid and invalid data based on row validation', () => {
    const data = [
      ['Asset 1', 'Criticality 1'],
      ['Asset 2', 'Criticality 2'],
      ['Asset 3', 'Invalid Criticality'],
    ];

    const result = validateParsedContent(data);

    expect(result.valid).toEqual([
      ['Asset 1', 'Criticality 1'],
      ['Asset 2', 'Criticality 2'],
    ]);

    expect(result.invalid).toEqual([['Asset 3', 'Invalid Criticality']]);

    expect(result.errors).toEqual([{ error: 'Invalid Criticality', index: 2 }]);
  });
});

describe('validateFile', () => {
  it('should return valid if the file is valid', () => {
    const file = new File(['file content'], 'test.csv');

    const result = validateFile(file, (bytes) => `${bytes} bytes`);

    expect(result.valid).toBe(true);
  });

  it('should return an error message if the file is invalid', () => {
    const file = new File(['file content'], 'test.txt');

    const result = validateFile(file, (bytes) => `${bytes} bytes`);

    expect(result.valid).toBe(false);
    expect(result.errorMessage).toBe('Invalid file type. Supported file types: .csv');
  });
});
