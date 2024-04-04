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
      error: 'Expected 3 columns got 0',
    });
  });

  it('should return valid false if the row has 2 columns', () => {
    expect(parseAssetCriticalityCsvRow(['host', 'host-1'])).toEqual({
      valid: false,
      error: 'Expected 3 columns got 2',
    });
  });

  it('should return valid false if the row has 4 columns', () => {
    expect(parseAssetCriticalityCsvRow(['host', 'host-1', 'low_impact', 'extra_data'])).toEqual({
      valid: false,
      error: 'Expected 3 columns got 4',
    });
  });

  it('should return valid false if the entity type is missing', () => {
    expect(parseAssetCriticalityCsvRow(['', 'host-1', 'low_impact'])).toEqual({
      valid: false,
      error: 'Missing entity type',
    });
  });

  it('should return valid false if the entity type is invalid', () => {
    expect(parseAssetCriticalityCsvRow(['invalid', 'host-1', 'low_impact'])).toEqual({
      valid: false,
      error: 'Invalid entity type invalid',
    });
  });

  it('should return valid false if the entity type is invalid and only log 1000 characters', () => {
    const invalidEntityType = 'x'.repeat(1001);
    expect(parseAssetCriticalityCsvRow([invalidEntityType, 'host-1', 'low_impact'])).toEqual({
      valid: false,
      error: `Invalid entity type ${invalidEntityType.substring(0, 1000)}...`,
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

  it('should return valid false if the criticality level is invalid and only log 1000 characters', () => {
    const invalidCriticalityLevel = 'x'.repeat(1001);
    expect(parseAssetCriticalityCsvRow(['host', 'host-1', invalidCriticalityLevel])).toEqual({
      valid: false,
      error: `Invalid criticality level ${invalidCriticalityLevel.substring(0, 1000)}...`,
    });
  });

  it('should return valid false if the ID is too long', () => {
    const idValue = 'x'.repeat(1001);
    expect(parseAssetCriticalityCsvRow(['host', idValue, 'low_impact'])).toEqual({
      valid: false,
      error: `ID is too long, expected less than 1000 characters got ${idValue.length}`,
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

  it('should return the parsed row if criticality level is the wrong case', () => {
    expect(parseAssetCriticalityCsvRow(['host', 'host-1', 'LOW_IMPACT'])).toEqual({
      valid: true,
      record: {
        idField: 'host.name',
        idValue: 'host-1',
        criticalityLevel: 'low_impact',
      },
    });
  });
});
