/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateParsedContent, validateFile } from './validations';

const formatBytes = (bytes: number) => bytes.toString();

describe('validateParsedContent', () => {
  it('should return empty arrays when data is empty', () => {
    const result = validateParsedContent([]);

    expect(result).toEqual({
      valid: [],
      invalid: [],
      errors: [],
    });
  });

  it('should return valid and invalid data based on row validation', () => {
    const data = [
      ['host', 'host-2', 'invalid_criticality'], // invalid
      ['user', 'user-1', 'low_criticality', 'invalid column'], // invalid
      ['host', 'host-1', 'low_impact'], // valid
    ];

    const result = validateParsedContent(data);

    expect(result).toEqual({
      valid: [data[2]],
      invalid: [data[0], data[1]],
      errors: [
        {
          error:
            'Invalid criticality level invalid_criticality expected one of extreme_impact, high_impact, medium_impact, low_impact',
          index: 1,
        },
        {
          error: 'Expected 3 columns got 4',
          index: 2,
        },
      ],
    });
  });
});

describe('validateFile', () => {
  it('should return valid if the file is valid', () => {
    const file = new File(['file content'], 'test.csv', { type: 'text/csv' });

    const result = validateFile(file, formatBytes);

    expect(result.valid).toBe(true);
  });

  it('should return an error message if the file type is invalid', () => {
    const file = new File(['file content'], 'test.txt', { type: 'invalid-type' });

    const result = validateFile(file, formatBytes) as {
      valid: false;
      errorMessage: string;
    };

    expect(result.valid).toBe(false);
    expect(result.errorMessage).toBe(
      'Invalid file format selected. Please choose a CSV, TXT, TSV file and try again'
    );
  });

  it('should return an error message if the file size is 0', () => {
    const file = new File([], 'test.txt', { type: 'text/csv' });

    const result = validateFile(file, formatBytes) as {
      valid: false;
      errorMessage: string;
    };

    expect(result.valid).toBe(false);
    expect(result.errorMessage).toBe('The selected file is empty.');
  });
});
