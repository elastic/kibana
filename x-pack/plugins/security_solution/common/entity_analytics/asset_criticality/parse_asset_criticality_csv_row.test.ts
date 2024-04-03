/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAssetCriticalityCsvRow } from './parse_asset_criticality_csv_row';

describe('parseAssetCriticalityCsvRow', () => {
  it('should return valid false if the row has no columns', () => {
    expect(parseAssetCriticalityCsvRow([])).toEqual({
      valid: false,
      error: 'Missing row data, expected 3 columns got 0',
    });
  });
  it('should return valid false if the row has 2 columns', () => {
    expect(parseAssetCriticalityCsvRow(['host', 'host-1'])).toEqual({
      valid: false,
      error: 'Missing row data, expected 3 columns got 2',
    });
  });

  it('should return valid false if the entity type is missing', () => {
    expect(parseAssetCriticalityCsvRow(['', 'host-1', 'low_impact'])).toEqual({
      valid: false,
      error: 'Missing entity type',
    });
  });

  it('should return valid false if the ID is missing', () => {
    expect(parseAssetCriticalityCsvRow(['host', '', 'low_impact'])).toEqual({
      valid: false,
      error: 'Missing ID',
    });
  });

  it('should return valid false if the criticality level is missing', () => {
    expect(parseAssetCriticalityCsvRow(['host', 'host-1', ''])).toEqual({
      valid: false,
      error: 'Missing criticality level',
    });
  });

  it('should return valid false if the criticality level is invalid', () => {
    expect(parseAssetCriticalityCsvRow(['host', 'host-1', 'invalid'])).toEqual({
      valid: false,
      error: 'Invalid criticality level invalid',
    });
  });

  it('should return the parsed row', () => {
    expect(parseAssetCriticalityCsvRow(['host', 'host-1', 'low_impact'])).toEqual({
      valid: true,
      record: {
        idField: 'host.name',
        idValue: 'host-1',
        criticalityLevel: 'low_impact',
      },
    });
  });
});
