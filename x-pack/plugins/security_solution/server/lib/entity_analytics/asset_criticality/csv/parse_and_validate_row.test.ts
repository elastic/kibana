/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAndValidateRow } from './parse_and_validate_row';

describe('parseAndValidateRow', () => {
  it('should throw an error if the row has no columns', () => {
    expect(() => parseAndValidateRow([])).toThrowError(
      'Missing row data, expected 3 columns got 0'
    );
  });
  it('should throw an error if the row has 2 columns', () => {
    expect(() => parseAndValidateRow(['host', 'host-1'])).toThrowError(
      'Missing row data, expected 3 columns got 2'
    );
  });

  it('should throw an error if the entity type is missing', () => {
    expect(() => parseAndValidateRow(['', 'host-1', 'low_impact'])).toThrowError(
      'Missing entity type'
    );
  });

  it('should throw an error if the ID is missing', () => {
    expect(() => parseAndValidateRow(['host', '', 'low_impact'])).toThrowError('Missing ID');
  });

  it('should throw an error if the criticality level is missing', () => {
    expect(() => parseAndValidateRow(['host', 'host-1', ''])).toThrowError(
      'Missing criticality level'
    );
  });

  it('should throw an error if the criticality level is invalid', () => {
    expect(() => parseAndValidateRow(['host', 'host-1', 'invalid'])).toThrowError(
      'Invalid criticality level invalid'
    );
  });

  it('should return the parsed row', () => {
    expect(parseAndValidateRow(['host', 'host-1', 'low_impact'])).toEqual({
      idField: 'host.name',
      idValue: 'host-1',
      criticalityLevel: 'low_impact',
    });
  });
});
